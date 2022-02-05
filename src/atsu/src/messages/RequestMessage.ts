//  Copyright (c) 2021 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { AtsuMessageType, AtsuMessageSerializationFormat, AtsuMessageDirection } from './AtsuMessage';
import { CpdlcMessage, CpdlcMessageResponse } from './CpdlcMessage';
import { cpdlcToString, wordWrap } from '../Common';

/**
 * Defines the general CPDLC request message
 */
export class RequestMessage extends CpdlcMessage {
    public Request: string = '';

    public Reason: string = '';

    public Freetext0: string = '';

    public Freetext1: string = '';

    public Freetext2: string = '';

    public Freetext3: string = '';

    public Freetext4: string = '';

    constructor() {
        super();
        this.Type = AtsuMessageType.Request;
        this.Direction = AtsuMessageDirection.Output;
    }

    public deserialize(jsonData: any): void {
        super.deserialize(jsonData);

        this.Request = jsonData.Request;
        this.Reason = jsonData.Reason;
        this.Freetext0 = jsonData.Freetext0;
        this.Freetext1 = jsonData.Freetext1;
        this.Freetext2 = jsonData.Freetext2;
        this.Freetext3 = jsonData.Freetext3;
        this.Freetext4 = jsonData.Freetext4;
    }

    public serialize(format: AtsuMessageSerializationFormat) {
        let content = this.Request;
        if (this.Reason !== '') {
            content += ` ${this.Reason}`;
        }
        let message = '';
        let freetext = [
            this.Freetext0,
            this.Freetext1,
            this.Freetext2,
            this.Freetext3,
            this.Freetext4,
        ];
        freetext = freetext.filter((n) => n);
        content += ` ${freetext.join(' ')}`;
        const lines = wordWrap(content, 25);

        if (format === AtsuMessageSerializationFormat.Network) {
            message = `/data2/${this.CurrentTransmissionId}/${this.PreviousTransmissionId !== -1 ? this.PreviousTransmissionId : ''}/${cpdlcToString(this.RequestedResponses)}`;
            message += `/${content}`;
        } else if (format === AtsuMessageSerializationFormat.DCDU) {
            message = lines.join('\n');
        } else if (format === AtsuMessageSerializationFormat.MCDU) {
            message += `{cyan}${this.Timestamp.dcduTimestamp()} TO ${this.Station}{end}\n`;
            message += lines.join('\n');
            message += '{white}------------------------{end}\n';

            if (this.ResponseType === CpdlcMessageResponse.Other && this.Response !== undefined) {
                message += this.Response.serialize(format);
            }
        } else if (format === AtsuMessageSerializationFormat.Printer) {
            message += `${this.Timestamp.dcduTimestamp()} TO ${this.Station}}\n`;
            message += lines.join('\n');
            message += '------------------------\n';

            if (this.ResponseType === CpdlcMessageResponse.Other && this.Response !== undefined) {
                message += this.Response.serialize(format);
            }
        } else {
            message = content;
        }

        return message;
    }
}
