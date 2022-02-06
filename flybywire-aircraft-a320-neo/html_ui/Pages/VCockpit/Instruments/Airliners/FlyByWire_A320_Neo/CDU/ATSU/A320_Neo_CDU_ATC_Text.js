class CDUAtcText {
    static CreateDataBlock() {
        return {
            performance: false,
            weather: false,
            turbulence: false,
            medical: false,
            technical: false,
            discretion: false,
            freetext: [ "", "", "", "", "" ]
        };
    }

    static CanSendData(mcdu, message, data) {
        if (mcdu.atsuManager.atc.currentStation() === "") {
            return false;
        }
        if (message === undefined) {
            return false;
        }
        if (data.performance || data.weather || data.turbulence || data.medical || data.technical || data.discretion) {
            return true;
        }
        const freetext = data.freetext.filter((n) => n);
        return freetext.length !== 0;
    }

    static CanEraseData(data) {
        if (data.performance || data.weather || data.turbulence || data.medical || data.technical || data.discretion) {
            return true;
        }
        const freetext = data.freetext.filter((n) => n);
        return freetext.length !== 0;
    }

    static CreateMessage(message, data) {
        let retval = message;
        let reason = true;
        if (!retval) {
            retval = new Atsu.RequestMessage();
        }

        if (data.performance) {
            retval.Reason = "DUE TO A/C PERFORMANCE";
        } else if (data.weather) {
            retval.Reason = "DUE TO WEATHER";
        } else if (data.turbulence) {
            retval.Reason = "DUE TO TURBULENCE";
        } else if (data.medical) {
            retval.Reason = "DUE TO MEDICAL";
        } else if (data.technical) {
            retval.Reason = "DUE TO TECHNICAL";
        } else if (data.discretion) {
            retval.Reason = "AT PILOT DISCRETION";
        } else {
            reason = false;
        }
        retval.Freetext = data.freetext.filter((n) => n);

        // reset the empty message
        if (!message && !reason && retval.Freetext.length === 0) {
            retval = null;
        }

        return retval;
    }

    static ShowPage1(mcdu, parent = null, message = null, data = CDUAtcText.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.atsuManager.atc.currentStation() === "") {
            mcdu.addNewMessage(NXSystemMessages.noAtc);
        }

        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPL\xa0[color]cyan";
        if (CDUAtcText.CanSendData(mcdu, message, data)) {
            reqDisplay = "REQ DISPL*[color]cyan";
        }
        if (CDUAtcText.CanEraseData(data)) {
            erase = "*ERASE";
        }

        const acPerform = ["\xa0DUE TO", "{cyan}{{end}A/C PERFORM"];
        if (data.performance) {
            acPerform[0] += "[color]cyan";
            acPerform[1] = "\xa0A/C PERFORM[color]cyan";
        }
        const weather = ["\xa0DUE TO", "{cyan}{{end}WEATHER"];
        if (data.weather) {
            weather[0] += "[color]cyan";
            weather[1] = "\xa0WEATHER[color]cyan";
        }
        const turbulence = ["\xa0DUE TO", "{cyan}{{end}TURBULENCE"];
        if (data.turbulence) {
            turbulence[0] += "[color]cyan";
            turbulence[1] = "\xa0TURBULENCE[color]cyan";
        }
        const medical = ["DUE TO\xa0", "MEDICAL{cyan}}{end}"];
        if (data.medical) {
            medical[0] += "[color]cyan";
            medical[1] = "MEDICAL\xa0[color]cyan";
        }
        const technical = ["DUE TO\xa0", "TECHNICAL{cyan}}{end}"];
        if (data.technical) {
            technical[0] += "[color]cyan";
            technical[1] = "TECHNICAL\xa0[color]cyan";
        }
        const discretion = ["AT PILOT\xa0", "DISCRETION{cyan}}{end}"];
        if (data.discretion) {
            discretion[0] += "[color]cyan";
            discretion[1] = "DISCRETION\xa0[color]cyan";
        }
        let freetext = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (data.freetext[0] !== "") {
            freetext = data.freetext[0];
        }

        mcdu.setTemplate([
            ["TEXT", "1", "2"],
            [acPerform[0], medical[0]],
            [acPerform[1], medical[1]],
            [weather[0], technical[0]],
            [weather[1], technical[1]],
            [turbulence[0], discretion[0]],
            [turbulence[1], discretion[1]],
            ["---------FREE TEXT---------"],
            [freetext],
            ["\xa0ALL FIELDS"],
            [erase, "ADD TEXT\xa0[color]cyan"],
            ["\xa0ATC MENU", `ATC ${parent ? parent : "TEXT"}\xa0[color]cyan`],
            ["<RETURN", reqDisplay]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.performance = false;
            } else {
                const oldFreetext = data.freetext;
                data = CDUAtcText.CreateDataBlock();
                data.performance = true;
                data.freetext = oldFreetext;
            }
            CDUAtcText.ShowPage1(mcdu, parent, message, data);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.weather = false;
            } else {
                const oldFreetext = data.freetext;
                data = CDUAtcText.CreateDataBlock();
                data.weather = true;
                data.freetext = oldFreetext;
            }
            CDUAtcText.ShowPage1(mcdu, parent, message, data);
        };

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.turbulence = false;
            } else {
                const oldFreetext = data.freetext;
                data = CDUAtcText.CreateDataBlock();
                data.turbulence = true;
                data.freetext = oldFreetext;
            }
            CDUAtcText.ShowPage1(mcdu, parent, message, data);
        };

        mcdu.leftInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.freetext[0] = "";
            } else if (value) {
                data.freetext[0] = value;
            }
            CDUAtcText.ShowPage1(mcdu, parent, message, data);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcText.ShowPage1(mcdu, parent, message);
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
                data.medical = false;
            } else {
                const oldFreetext = data.freetext;
                data = CDUAtcText.CreateDataBlock();
                data.medical = true;
                data.freetext = oldFreetext;
            }
            CDUAtcText.ShowPage1(mcdu, parent, message, data);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.technical = false;
            } else {
                const oldFreetext = data.freetext;
                data = CDUAtcText.CreateDataBlock();
                data.technical = true;
                data.freetext = oldFreetext;
            }
            CDUAtcText.ShowPage1(mcdu, parent, message, data);
        };

        mcdu.rightInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.discretion = false;
            } else {
                const oldFreetext = data.freetext;
                data = CDUAtcText.CreateDataBlock();
                data.discretion = true;
                data.freetext = oldFreetext;
            }
            CDUAtcText.ShowPage1(mcdu, parent, message, data);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcText.CanSendData(mcdu, message, data)) {
                const prepMessage = CDUAtcText.CreateMessage(message, data);
                if (prepMessage) {
                    mcdu.atsuManager.registerMessage(prepMessage);
                }
                CDUAtcText.ShowPage1(mcdu, parent);
            } else {
                CDUAtcText.ShowPage1(mcdu, parent, message, data);
            }
        };

        mcdu.onNextPage = () => {
            CDUAtcText.ShowPage2(mcdu, parent, message, data);
        };
    }

    static ShowPage2(mcdu, parent, message = null, data = CDUAtcText.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.atsuManager.atc.currentStation() === "") {
            mcdu.addNewMessage(NXSystemMessages.noAtc);
        }

        let freetext1 = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (data.freetext[1] !== "") {
            freetext1 = data.freetext[1];
        }
        let freetext2 = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (data.freetext[2] !== "") {
            freetext2 = data.freetext[2];
        }
        let freetext3 = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (data.freetext[3] !== "") {
            freetext3 = data.freetext[3];
        }
        let freetext4 = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (data.freetext[4] !== "") {
            freetext4 = data.freetext[4];
        }

        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPL\xa0[color]cyan";
        if (CDUAtcText.CanSendData(mcdu, message, data)) {
            reqDisplay = "REQ DISPL*[color]cyan";
        }
        if (CDUAtcText.CanEraseData(data)) {
            erase = "*ERASE";
        }

        mcdu.setTemplate([
            ["TEXT", "2", "2"],
            [""],
            [freetext1],
            [""],
            [freetext2],
            [""],
            [freetext3],
            [""],
            [freetext4],
            ["\xa0ALL FIELDS"],
            [erase],
            ["\xa0ATC MENU", `ATC ${parent}\xa0[color]cyan`],
            ["<RETURN", reqDisplay]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.freetext[1] = "";
            } else if (value) {
                data.freetext[1] = value;
            }
            CDUAtcText.ShowPage2(mcdu, parent, message, data);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.freetext[2] = "";
            } else if (value) {
                data.freetext[2] = value;
            }
            CDUAtcText.ShowPage2(mcdu, parent, message, data);
        };

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.freetext[3] = "";
            } else if (value) {
                data.freetext[3] = value;
            }
            CDUAtcText.ShowPage2(mcdu, parent, message, data);
        };

        mcdu.leftInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.freetext[4] = "";
            } else if (value) {
                data.freetext[4] = value;
            }
            CDUAtcText.ShowPage2(mcdu, parent, message, data);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcText.ShowPage2(mcdu, parent, message);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcText.CanSendData(mcdu, message, data)) {
                const prepMessage = CDUAtcText.CreateMessage(message, data);
                if (prepMessage) {
                    mcdu.atsuManager.registerMessage(prepMessage);
                }
                CDUAtcText.ShowPage2(mcdu, parent);
            } else {
                CDUAtcText.ShowPage2(mcdu, parent, message, data);
            }
        };

        mcdu.onPrevPage = () => {
            CDUAtcText.ShowPage1(mcdu, parent, message, data);
        };
    }
}
