//  Copyright (c) 2021 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { AtsuMessageType, AtsuMessageSerializationFormat, AtsuMessageDirection } from './AtsuMessage';
import { CpdlcMessageResponse } from './CpdlcMessage';
import { cpdlcToString, wordWrap } from '../Common';
import { RequestMessage } from './RequestMessage';

/**
 * Defines the general CPDLC emergency message
 */
export class EmergencyMessage extends RequestMessage {
    public Level: string = '';

    public SoulsAndEndurance: string = '';

    constructor() {
        super();
        this.Type = AtsuMessageType.Emergency;
        this.Direction = AtsuMessageDirection.Output;
    }

    public deserialize(jsonData: any): void {
        super.deserialize(jsonData);

        this.Level = jsonData.Level;
        this.SoulsAndEndurance = jsonData.SoulsAndEndurance;
    }

    public serialize(format: AtsuMessageSerializationFormat) {
        // create the standard text that is comparable to
        let content = this.Request;
        if (this.Reason !== '') {
            content += ` ${this.Reason}`;
        }
        content += ` ${this.Freetext.join(' ')}`;
        const lines = wordWrap(content, 25);

        // put the emergency level to the front or a new line
        content = `${this.Level} ${content}`;
        lines.unshift(this.Level);
        // add the souls and endurance if it is set
        if (this.SoulsAndEndurance) {
            lines.push(this.SoulsAndEndurance);
            content = `${content} ${this.SoulsAndEndurance}`;
        }

        let message = '';

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
