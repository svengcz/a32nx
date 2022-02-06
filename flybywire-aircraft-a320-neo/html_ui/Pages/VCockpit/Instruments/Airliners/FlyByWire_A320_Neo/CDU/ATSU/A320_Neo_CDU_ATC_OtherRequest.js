class CDUAtcOtherRequest {
    static CanSendData(mcdu, data) {
        if (mcdu.atsuManager.atc.currentStation() === "") {
            return false;
        }
        return data.voiceContact && data.freq || data.ownSeparation || data.clearance;
    }

    static CanEraseData(data) {
        return data.voiceContact || data.freq || data.ownSeparation || data.clearance;
    }

    static CreateDataBlock() {
        return {
            freq: null,
            voiceContact: false,
            ownSeparation: false,
            clearance: false
        };
    }

    static CreateMessage(data) {
        const retval = new Atsu.RequestMessage();

        if (data.voiceContact && data.freq) {
            retval.Request = `REQUEST VOICE CONTACT ON ${data.freq}`;
        } else if (data.ownSeparation) {
            retval.Request = "REQUEST OWN SEPARATION & VMC";
        } else if (data.clearance) {
            retval.Request = "REQUEST CLEARANCE";
        } else {
            retval = null;
        }

        return retval;
    }

    static ValidateFrequency(value) {
        // valid frequency range: 118.000 - 136.975
        if (!/^1[1-3][0-9].[0-9]{2}[0|5]$/.test(value)) {
            return NXSystemMessages.formatError;
        }

        const elements = value.split(".");
        const before = parseInt(elements[0]);
        if (before < 118 || before > 136) {
            return NXSystemMessages.entryOutOfRange;
        }

        // valid 8.33 kHz spacings
        const frequencySpacingOther = [ "00", "05", "10", "15", "25", "30", "35", "40", "50", "55", "60", "65", "75", "80", "85", "90" ];
        const frequencySpacingEnd = [ "00", "05", "10", "15", "25", "30", "35", "40", "50", "55", "60", "65", "75" ];

        // validate the correct frequency fraction
        const twoDigitFraction = elements[1].substring(1, elements[1].length);
        if (before === 136) {
            if (frequencySpacingEnd.findIndex((entry) => entry === twoDigitFraction) === -1) {
                return NXSystemMessages.entryOutOfRange;
            }
        } else {
            if (frequencySpacingOther.findIndex((entry) => entry === twoDigitFraction) === -1) {
                return NXSystemMessages.entryOutOfRange;
            }
        }

        return null;
    }

    static ShowPage(mcdu, data = CDUAtcOtherRequest.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.atsuManager.atc.currentStation() === "") {
            mcdu.addNewMessage(NXSystemMessages.noAtc);
        }

        let frequency = "[        ][color]cyan";
        if (data.freq) {
            frequency = `${data.freq}[color]cyan`;
        }

        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPL\xa0[color]cyan";
        if (CDUAtcOtherRequest.CanEraseData(data)) {
            erase = "*ERASE";
        }
        if (CDUAtcOtherRequest.CanSendData(mcdu, data)) {
            reqDisplay = "REQ DISPL*[color]cyan";
        }

        mcdu.setTemplate([
            ["ATC OTHER REQ"],
            ["\xa0VOICE", "FREQ\xa0"],
            ["{cyan}{{end}CONTACT------", frequency],
            [""],
            ["{cyan}{{end}OWN SEPARATION & VMC"],
            [""],
            ["{cyan}{{end}CLEARANCE"],
            [""],
            [""],
            ["\xa0ALL FIELDS"],
            [erase, "ADD TEXT>"],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", reqDisplay]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.voiceContact = false;
            } else {
                const freq = data.freq;
                data = CDUAtcOtherRequest.CreateDataBlock();
                data.voiceContact = true;
                data.freq = freq;
            }
            CDUAtcOtherRequest.ShowPage(mcdu, data);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.ownSeparation = false;
            } else {
                data = CDUAtcOtherRequest.CreateDataBlock();
                data.ownSeparation = true;
            }
            CDUAtcOtherRequest.ShowPage(mcdu, data);
        };

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.clearance = false;
            } else {
                data = CDUAtcOtherRequest.CreateDataBlock();
                data.clearance = true;
            }
            CDUAtcOtherRequest.ShowPage(mcdu, data);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcOtherRequest.ShowPage(mcdu);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[0] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.freq = null;
            } else if (value) {
                const error = CDUAtcOtherRequest.ValidateFrequency(value);
                if (error) {
                    mcdu.addNewMessage(error);
                } else {
                    const voiceRequest = data.voiceContact;
                    data = CDUAtcOtherRequest.CreateDataBlock();
                    data.voiceContact = voiceRequest;
                    data.freq = value;
                }
            }
            CDUAtcOtherRequest.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            let message = null;
            if (CDUAtcOtherRequest.CanSendData(mcdu, data)) {
                message = CDUAtcOtherRequest.CreateMessage(data);
            }
            CDUAtcText.ShowPage1(mcdu, "REQ", message);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcOtherRequest.CanSendData(mcdu, data)) {
                const message = CDUAtcOtherRequest.CreateMessage(data);
                if (message) {
                    mcdu.atsuManager.registerMessage(message);
                }
                CDUAtcOtherRequest.ShowPage(mcdu);
            }
        };
    }
}
