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

    static ShowPage(mcdu, data = CDUAtcOtherRequest.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.atsuManager.atc.currentStation() === "") {
            mcdu.addNewMessage(NXSystemMessages.noAtc);
        }

        let frequency = "[        ][color]cyan";
        if (data.freq) {
            frequency = `${data.freq}[color]cyan`;
        }
        let voice = "\xa0VOICE";
        let contact = "{cyan}{{end}CONTACT------";
        if (data.voiceContact) {
            contact = "\xa0CONTACT------[color]cyan";
            voice = "\xa0VOICE[color]cyan";
        }
        let ownSeparation = "{cyan}{{end}OWN SEPARATION & VMC";
        if (data.ownSeparation) {
            ownSeparation = "\xa0OWN SEPARATION & VMC[color]cyan";
        }
        let clearance = "{cyan}{{end}CLEARANCE";
        if (data.clearance) {
            clearance = "\xa0CLEARANCE[color]cyan";
        }

        let text = "ADD TEXT\xa0";
        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPL\xa0[color]cyan";
        if (CDUAtcOtherRequest.CanEraseData(data)) {
            erase = "*ERASE";
        }
        if (CDUAtcOtherRequest.CanSendData(mcdu, data)) {
            reqDisplay = "REQ DISPL*[color]cyan";
            text = "ADD TEXT>";
        }

        mcdu.setTemplate([
            ["ATC OTHER REQ"],
            [voice, "FREQ\xa0"],
            [contact, frequency],
            [""],
            [ownSeparation],
            [""],
            [clearance],
            [""],
            [""],
            ["\xa0ALL FIELDS"],
            [erase, text],
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
                const error = mcdu.validateFrequency(value);
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
                CDUAtcText.ShowPage1(mcdu, "REQ", message);
            }
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
