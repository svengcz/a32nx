//  Copyright (c) 2022 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { HoppieConnector } from './com/HoppieConnector';
import { AtsuStatusCodes } from './AtsuStatusCodes';
import { AtisMessage } from './messages/AtisMessage';
import { AtsuTimestamp } from './messages/AtsuTimestamp';
import { AtsuMessageComStatus, AtsuMessage, AtsuMessageType, AtsuMessageDirection } from './messages/AtsuMessage';
import { CpdlcMessageResponse, CpdlcMessageRequestedResponseType, CpdlcMessage } from './messages/CpdlcMessage';
import { Datalink } from './com/Datalink';
import { AtsuManager } from './AtsuManager';

export class AtcSystem {
    private parent: AtsuManager | undefined = undefined;

    private datalink: Datalink | undefined = undefined;

    private listener = RegisterViewListener('JS_LISTENER_SIMVARS');

    private currentAtc = '';

    private nextAtc = '';

    private notificationTime = 0;

    private cpdlcMessageId = 0;

    private messageQueue: CpdlcMessage[] = [];

    private dcduBufferedMessages: number[] = [];

    private unreadMessagesLastCycle: number = 0;

    private lastRingTime: number = 0;

    private printAtisReport = false;

    private atisAutoUpdateIcaos: string[] = [];

    private atisMessages: Map<string, [number, AtisMessage[]]> = new Map();

    constructor(parent: AtsuManager, datalink: Datalink) {
        this.parent = parent;
        this.datalink = datalink;

        // initialize the variables for the DCDU communication
        SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_DELETE_UID', 'number', -1);
        SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_ANSWER', 'number', -1);
        SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_SEND_UID', 'number', -1);
        SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_PRINT_UID', 'number', -1);

        setInterval(async () => {
            if (SimVar.GetSimVarValue('L:A32NX_HOPPIE_ACTIVE', 'number') !== 1) {
                if (this.currentAtc !== '') {
                    await this.logoff();
                }
                return;
            }

            this.handleDcduMessageSync();
            this.handlePilotNotifications();

            // check if we have to timeout the logon request
            if (this.logonInProgress()) {
                const currentTime = SimVar.GetGlobalVarValue('ZULU TIME', 'seconds');
                const delta = currentTime - this.notificationTime;
                if (delta >= 300) {
                    this.resetLogon();
                }
            }
        }, 100);

        // ATIS runs every ten minutes
        setInterval(() => {
            const currentTime = new AtsuTimestamp().Seconds;
            this.atisAutoUpdateIcaos.forEach((icao) => {
                if (this.atisMessages.has(icao)) {
                    const delta = currentTime - this.atisMessages.get(icao)[0];
                    if (delta >= 10 * 60000) {
                        this.updateAtis(icao, false).then((code) => {
                            if (code === AtsuStatusCodes.Ok) {
                                this.atisMessages.get(icao)[0] = currentTime;
                            } else {
                                this.parent.publishAtsuStatusCode(code);
                            }
                        });
                    } else {
                        this.atisMessages.get(icao)[0] = currentTime;
                    }
                } else {
                    this.updateAtis(icao, false).then((code) => {
                        if (code !== AtsuStatusCodes.Ok) {
                            this.parent.publishAtsuStatusCode(code);
                        }
                    });
                }
            });
        }, 60000);
    }

    private handleDcduMessageSync() {
        // check if a message needs to be deleted
        if (SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_DELETE_UID', 'number') !== -1) {
            this.removeMessage(SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_DELETE_UID', 'number'));
            SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_DELETE_UID', 'number', -1);
        }

        // handle send calls of messages
        if (SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_SEND_UID', 'number') !== -1) {
            const message = this.parent.findMessage(SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_SEND_UID', 'number'));
            if (message !== undefined) {
                if (message.Direction === AtsuMessageDirection.Output) {
                    this.sendMessage(message).then((code) => {
                        if (code !== AtsuStatusCodes.Ok) {
                            this.parent.publishAtsuStatusCode(code);
                        }
                    });
                    SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_SEND_UID', 'number', -1);
                } else if (SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_ANSWER', 'number') !== -1) {
                    this.sendResponse(SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_SEND_UID', 'number'), SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_ANSWER', 'number') as CpdlcMessageResponse);
                    SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_ANSWER', 'number', -1);
                    SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_SEND_UID', 'number', -1);
                }
            }
        }

        // handle print calls of the message
        if (SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_PRINT_UID', 'number') !== -1) {
            const message = this.parent.findMessage(SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_PRINT_UID', 'number'));
            if (message !== undefined) {
                this.parent.printMessage(message);
            }
            SimVar.SetSimVarValue('L:A32NX_DCDU_MSG_PRINT_UID', 'number', -1);
        }

        // reset the ACK btn if it is clicked
        if (SimVar.GetSimVarValue('L:A32NX_DCDU_ATC_MSG_ACK', 'number') === 1) {
            SimVar.SetSimVarValue('L:A32NX_DCDU_ATC_MSG_WAITING', 'boolean', 0);
            SimVar.SetSimVarValue('L:A32NX_DCDU_ATC_MSG_ACK', 'number', 0);
        }

        // check if the buffer of the DCDU is available
        if (SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_MAX_REACHED', 'boolean') === 0) {
            while (this.dcduBufferedMessages.length !== 0) {
                if (SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_MAX_REACHED', 'boolean') !== 0) {
                    break;
                }

                const uid = this.dcduBufferedMessages.shift();
                const message = this.messageQueue.find((element) => element.UniqueMessageID === uid);
                if (message !== undefined) {
                    this.listener.triggerToAllSubscribers('A32NX_DCDU_MSG', message);
                }
            }
        }
    }

    private handlePilotNotifications() {
        const unreadMessages = SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_UNREAD_MSGS', 'number');

        if (unreadMessages !== 0) {
            const currentTime = new Date().getTime();
            let callRing = false;

            if (this.unreadMessagesLastCycle < unreadMessages) {
                this.lastRingTime = 0;
                callRing = true;
            } else {
                const delta = Math.round(Math.abs((currentTime - this.lastRingTime) / 1000));

                if (delta >= 10) {
                    this.lastRingTime = currentTime;
                    callRing = SimVar.GetSimVarValue('L:A32NX_DCDU_ATC_MSG_WAITING', 'boolean') === 1;
                }
            }

            if (callRing) {
                SimVar.SetSimVarValue('L:A32NX_DCDU_ATC_MSG_WAITING', 'boolean', 1);
                Coherent.call('PLAY_INSTRUMENT_SOUND', 'cpdlc_ring');
                this.lastRingTime = currentTime;

                // ensure that the timeout is longer than the sound
                setTimeout(() => SimVar.SetSimVarValue('W:cpdlc_ring', 'boolean', 0), 2000);
            }
        } else {
            SimVar.SetSimVarValue('L:A32NX_DCDU_ATC_MSG_WAITING', 'boolean', 0);
        }

        this.unreadMessagesLastCycle = unreadMessages;
    }

    public static async connect(): Promise<AtsuStatusCodes> {
        const flightNo = SimVar.GetSimVarValue('ATC FLIGHT NUMBER', 'string');
        return HoppieConnector.isCallsignInUse(flightNo);
    }

    public static async disconnect(): Promise<AtsuStatusCodes> {
        return AtsuStatusCodes.Ok;
    }

    public currentStation(): string {
        return this.currentAtc;
    }

    public nextStation(): string {
        return this.nextAtc;
    }

    public nextStationNotificationTime(): number {
        return this.notificationTime;
    }

    public logonInProgress(): boolean {
        return this.nextAtc !== '';
    }

    public resetLogon(): void {
        this.currentAtc = '';
        this.nextAtc = '';
        this.notificationTime = 0;
        this.listener.triggerToAllSubscribers('A32NX_DCDU_ATC_LOGON_MSG', '');
    }

    public async logon(station: string): Promise<AtsuStatusCodes> {
        if (this.nextAtc !== '' && station !== this.nextAtc) {
            return AtsuStatusCodes.SystemBusy;
        }

        if (this.currentAtc !== '') {
            const retval = await this.logoff();
            if (retval !== AtsuStatusCodes.Ok) {
                return retval;
            }
        }

        const message = new CpdlcMessage();
        message.Station = station;
        message.CurrentTransmissionId = ++this.cpdlcMessageId;
        message.Direction = AtsuMessageDirection.Output;
        message.RequestedResponses = CpdlcMessageRequestedResponseType.Yes;
        message.ComStatus = AtsuMessageComStatus.Sending;
        message.Message = 'REQUEST LOGON';

        this.nextAtc = station;
        this.parent.registerMessage(message);
        this.listener.triggerToAllSubscribers('A32NX_DCDU_ATC_LOGON_MSG', `NEXT ATC: ${station}`);
        this.notificationTime = SimVar.GetGlobalVarValue('ZULU TIME', 'seconds');

        return this.datalink.sendMessage(message, false);
    }

    private async logoffWithoutReset(): Promise<AtsuStatusCodes> {
        if (this.currentAtc === '') {
            return AtsuStatusCodes.NoAtc;
        }

        const message = new CpdlcMessage();
        message.Station = this.currentAtc;
        message.CurrentTransmissionId = ++this.cpdlcMessageId;
        message.Direction = AtsuMessageDirection.Output;
        message.RequestedResponses = CpdlcMessageRequestedResponseType.No;
        message.ComStatus = AtsuMessageComStatus.Sending;
        message.Message = 'LOGOFF';

        this.parent.registerMessage(message);

        return this.datalink.sendMessage(message, true).then((error) => error);
    }

    public async logoff(): Promise<AtsuStatusCodes> {
        return this.logoffWithoutReset().then((error) => {
            this.listener.triggerToAllSubscribers('A32NX_DCDU_ATC_LOGON_MSG', '');
            this.currentAtc = '';
            this.nextAtc = '';
            return error;
        });
    }

    private createCpdlcResponse(request: CpdlcMessage) {
        // create the meta information of the response
        const response = new CpdlcMessage();
        response.Direction = AtsuMessageDirection.Output;
        response.CurrentTransmissionId = ++this.cpdlcMessageId;
        response.PreviousTransmissionId = request.CurrentTransmissionId;
        response.RequestedResponses = CpdlcMessageRequestedResponseType.No;
        response.Station = request.Station;

        // create the answer text
        switch (request.ResponseType) {
        case CpdlcMessageResponse.Acknowledge:
            response.Message = 'ACKNOWLEDGE';
            break;
        case CpdlcMessageResponse.Affirm:
            response.Message = 'AFFIRM';
            break;
        case CpdlcMessageResponse.Negative:
            response.Message = 'NEGATIVE';
            break;
        case CpdlcMessageResponse.Refuse:
            response.Message = 'REFUSE';
            break;
        case CpdlcMessageResponse.Roger:
            response.Message = 'ROGER';
            break;
        case CpdlcMessageResponse.Standby:
            response.Message = 'STANDBY';
            break;
        case CpdlcMessageResponse.Unable:
            response.Message = 'UNABLE';
            break;
        case CpdlcMessageResponse.Wilco:
            response.Message = 'WILCO';
            break;
        default:
            return undefined;
        }

        return response;
    }

    private sendResponse(uid: number, response: CpdlcMessageResponse): void {
        const message = this.messageQueue.find((element) => element.UniqueMessageID === uid);
        if (message !== undefined) {
            message.ResponseType = response;
            message.Response = this.createCpdlcResponse(message);
            message.Response.ComStatus = AtsuMessageComStatus.Sending;
            this.listener.triggerToAllSubscribers('A32NX_DCDU_MSG', message);

            if (message.Response !== undefined) {
                this.datalink.sendMessage(message.Response, false).then((code) => {
                    if (code === AtsuStatusCodes.Ok) {
                        message.Response.ComStatus = AtsuMessageComStatus.Sent;
                    } else {
                        message.Response.ComStatus = AtsuMessageComStatus.Failed;
                    }
                    this.listener.triggerToAllSubscribers('A32NX_DCDU_MSG', message);
                });
            }
        }
    }

    public async sendMessage(message: AtsuMessage): Promise<AtsuStatusCodes> {
        if (message.Station === '') {
            if (this.currentAtc === '') {
                return AtsuStatusCodes.NoAtc;
            }
            message.Station = this.currentAtc;
        }

        message.ComStatus = AtsuMessageComStatus.Sending;
        this.listener.triggerToAllSubscribers('A32NX_DCDU_MSG', message);

        return this.datalink.sendMessage(message, false).then((code) => {
            if (code === AtsuStatusCodes.Ok) {
                message.ComStatus = AtsuMessageComStatus.Sent;
            } else {
                message.ComStatus = AtsuMessageComStatus.Failed;
            }
            this.listener.triggerToAllSubscribers('A32NX_DCDU_MSG', message);
            return code;
        });
    }

    public messages(): AtsuMessage[] {
        return this.messageQueue;
    }

    public static isRelevantMessage(message: AtsuMessage): boolean {
        return message.Type > AtsuMessageType.AOC && message.Type < AtsuMessageType.ATC;
    }

    public removeMessage(uid: number): boolean {
        const index = this.messageQueue.findIndex((element) => element.UniqueMessageID === uid);
        if (index !== -1) {
            this.listener.triggerToAllSubscribers('A32NX_DCDU_MSG_DELETE_UID', uid);
            this.messageQueue.splice(index, 1);
        }
        return index !== -1;
    }

    public cleanupMessages(): void {
        this.messageQueue.forEach((message) => this.listener.triggerToAllSubscribers('A32NX_DCDU_MSG_DELETE_UID', message.UniqueMessageID));
        this.messageQueue = [];
        this.atisMessages = new Map();
    }

    private analyzeMessage(request: CpdlcMessage, response: CpdlcMessage): boolean {
        if (request.RequestedResponses === CpdlcMessageRequestedResponseType.NotRequired && response === undefined) {
            // received the station message for the DCDU
            if (request.Message.includes('CURRENT ATC')) {
                this.listener.triggerToAllSubscribers('A32NX_DCDU_ATC_LOGON_MSG', request.Message);
                return true;
            }

            // received a logoff message
            if (request.Message.includes('LOGOFF')) {
                this.listener.triggerToAllSubscribers('A32NX_DCDU_ATC_LOGON_MSG', '');
                this.currentAtc = '';
                return true;
            }

            // received a service terminated message
            if (request.Message.includes('TERMINATED')) {
                this.listener.triggerToAllSubscribers('A32NX_DCDU_ATC_LOGON_MSG', '');
                this.currentAtc = '';
                return true;
            }

            // process the handover message
            if (request.Message.includes('HANDOVER')) {
                const entries = request.Message.split(' ');
                if (entries.length >= 2) {
                    const station = entries[1].replace(/@/gi, '');
                    this.logon(station);
                    return true;
                }
            }
        }

        // expecting a LOGON or denied message
        if (this.nextAtc !== '' && request !== undefined && response !== undefined) {
            if (request.Message.startsWith('REQUEST')) {
                // logon accepted by ATC
                if (response.Message.includes('LOGON ACCEPTED')) {
                    this.listener.triggerToAllSubscribers('A32NX_DCDU_ATC_LOGON_MSG', `CURRENT ATC UNIT @${this.nextAtc}@`);
                    this.currentAtc = this.nextAtc;
                    this.nextAtc = '';
                    return true;
                }

                // logon rejected
                if (response.Message.includes('UNABLE')) {
                    this.listener.triggerToAllSubscribers('A32NX_DCDU_ATC_LOGON_MSG', '');
                    this.currentAtc = '';
                    this.nextAtc = '';
                    return true;
                }
            }
        }

        // TODO later analyze requests by ATC
        return false;
    }

    public insertMessage(message: AtsuMessage): void {
        const cpdlcMessage = message as CpdlcMessage;
        let analyzed = false;

        if (cpdlcMessage.Direction === AtsuMessageDirection.Output && cpdlcMessage.CurrentTransmissionId === -1) {
            cpdlcMessage.CurrentTransmissionId = ++this.cpdlcMessageId;
        }

        // search corresponding request, if previous ID is set
        if (cpdlcMessage.PreviousTransmissionId !== -1) {
            this.messageQueue.forEach((element) => {
                // ensure that the sending and receiving stations are the same to avoid CPDLC ID overlaps
                if (element.Station === cpdlcMessage.Station) {
                    while (element !== undefined) {
                        if (element.CurrentTransmissionId === cpdlcMessage.PreviousTransmissionId) {
                            if (element.ResponseType === undefined) {
                                element.ResponseType = CpdlcMessageResponse.Other;
                            }
                            element.Response = cpdlcMessage;
                            analyzed = this.analyzeMessage(element, cpdlcMessage);
                            break;
                        }
                        element = element.Response;
                    }
                }
            });
        } else {
            this.messageQueue.unshift(cpdlcMessage);
            analyzed = this.analyzeMessage(cpdlcMessage, undefined);
        }

        if (!analyzed) {
            if (cpdlcMessage.Direction === AtsuMessageDirection.Output && cpdlcMessage.Station === '') {
                cpdlcMessage.Station = this.currentAtc;
            }

            const dcduRelevant = cpdlcMessage.ComStatus === AtsuMessageComStatus.Open || cpdlcMessage.ComStatus === AtsuMessageComStatus.Received;
            if (dcduRelevant && SimVar.GetSimVarValue('L:A32NX_DCDU_MSG_MAX_REACHED', 'boolean') === 0) {
                this.listener.triggerToAllSubscribers('A32NX_DCDU_MSG', message as CpdlcMessage);
            } else if (dcduRelevant) {
                this.parent.publishAtsuStatusCode(AtsuStatusCodes.DcduFull);
                this.dcduBufferedMessages.push(message.UniqueMessageID);
            }
        }
    }

    public messageRead(uid: number): boolean {
        const index = this.messageQueue.findIndex((element) => element.UniqueMessageID === uid);
        if (index !== -1 && this.messageQueue[index].Direction === AtsuMessageDirection.Input) {
            this.messageQueue[index].Confirmed = true;
        }

        return index !== -1;
    }

    private async updateAtis(icao: string, overwrite: boolean): Promise<AtsuStatusCodes> {
        return this.datalink.receiveAtis(icao).then((retval) => {
            if (retval[0] === AtsuStatusCodes.Ok) {
                let code = AtsuStatusCodes.Ok;
                const atis = retval[1] as AtisMessage;
                atis.Timestamp = new AtsuTimestamp();
                atis.parseInformation();
                let printable = false;

                if (atis.Information === '') {
                    return AtsuStatusCodes.NoAtisReceived;
                }

                if (this.atisMessages.get(icao) !== undefined) {
                    if (this.atisMessages.get(icao)[1][0].Information !== atis.Information) {
                        this.atisMessages.get(icao)[1].unshift(atis);
                        code = AtsuStatusCodes.NewAtisReceived;
                        printable = true;
                    } else if (overwrite) {
                        this.atisMessages.get(icao)[1][0] = atis;
                        code = AtsuStatusCodes.NewAtisReceived;
                    }
                } else {
                    this.atisMessages.set(icao, [atis.Timestamp.Seconds, [atis]]);
                    code = AtsuStatusCodes.NewAtisReceived;
                    printable = true;
                }

                this.atisMessages.get(icao)[0] = atis.Timestamp.Seconds;

                if (this.printAtisReport && printable) {
                    this.parent.printMessage(atis);
                }

                return code;
            }

            return retval[0];
        });
    }

    public togglePrintAtisReports() {
        this.printAtisReport = !this.printAtisReport;
    }

    public printAtisReportsPrint(): boolean {
        return this.printAtisReport;
    }

    public async receiveAtis(icao: string): Promise<AtsuStatusCodes> {
        return this.updateAtis(icao, true);
    }

    public atisReports(icao: string): AtisMessage[] {
        if (this.atisMessages.has(icao)) {
            return this.atisMessages.get(icao)[1];
        }
        return [];
    }

    public atisAutoUpdateActive(icao: string): boolean {
        return this.atisAutoUpdateIcaos.findIndex((elem) => icao === elem) !== -1;
    }

    public activateAtisAutoUpdate(icao: string): void {
        if (this.atisAutoUpdateIcaos.find((elem) => elem === icao) === undefined) {
            this.atisAutoUpdateIcaos.push(icao);
        }
    }

    public deactivateAtisAutoUpdate(icao: string): void {
        const idx = this.atisAutoUpdateIcaos.findIndex((elem) => icao === elem);
        if (idx >= 0) {
            this.atisAutoUpdateIcaos.splice(idx, 1);
        }
    }
}
