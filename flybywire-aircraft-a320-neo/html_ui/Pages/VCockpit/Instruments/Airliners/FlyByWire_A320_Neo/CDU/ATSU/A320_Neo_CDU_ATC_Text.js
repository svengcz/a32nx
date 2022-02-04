class CDUAtcText {
    static SendableMessage(mcdu) {
        if (mcdu.requestMessage === undefined) {
            return false;
        }
        if (mcdu.requestMessage.Freetext0 !== "" || mcdu.requestMessage.Freetext1 !== "" || mcdu.requestMessage.Freetext2 !== "") {
            return true;
        }
        return mcdu.requestMessage.Freetext3 !== "" || mcdu.requestMessage.Freetext4 !== "";
    }

    static ShowPage1(mcdu, parent = null, perf = false, med = false, wx = false, tech = false, turb = false, disc = false) {
        mcdu.clearDisplay();

        let send = false;
        if (parent || perf || med || wx || tech || turb || disc || CDUAtcText.SendableMessage(mcdu)) {
            send = true;
        }
        if (mcdu.requestMessage === undefined) {
            mcdu.requestMessage = new Atsu.RequestMessage();
        }

        let freetext = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (mcdu.requestMessage.Freetext0 !== "") {
            freetext = mcdu.RequestMessage.Freetext0;
        }

        mcdu.setTemplate([
            ["TEXT", "1", "2}"],
            ["\xa0DUE TO", "DUE TO\xa0"],
            ["{cyan}{{end}A/C PERFORM", "MEDICAL{cyan}}{end}"],
            ["\xa0DUE TO", "DUE TO\xa0"],
            ["{cyan}{{end}WEATHER", "TECHNICAL{cyan}}{end}"],
            ["\xa0DUE TO", "AT PILOT\xa0"],
            ["{cyan}{{end}TURBULENCE", "DISCRETION{cyan}}{end}"],
            ["---------FREE TEXT---------"],
            [freetext],
            ["\xa0ALL FIELDS"],
            [`${send ? "*" : "\xa0"}ERASE`],
            ["\xa0ATC MENU", `ATC ${parent ? parent : "TEXT"}\xa0[color]cyan`],
            ["<RETURN", `REQ DISPL${send ? "*" : "\xa0"}[color]cyan`]
        ], true);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = () => {
            CDUAtcText.ShowPage1(mcdu, parent, true, false, false, false, false, false);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = () => {
            CDUAtcText.ShowPage1(mcdu, parent, false, false, true, false, false, false);
        };

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = () => {
            CDUAtcText.ShowPage1(mcdu, parent, false, false, false, false, true, false);
        };

        mcdu.leftInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue || !value) {
                mcdu.requestMessage.Freetext0 = "";
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            } else {
                mcdu.requestMessage.Freetext0 = value;
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            }
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            if (!parent) {
                mcdu.requestMessage = undefined;
            } else {
                mcdu.requestMessage.Freetext0 = '';
                mcdu.requestMessage.Freetext1 = '';
                mcdu.requestMessage.Freetext2 = '';
                mcdu.requestMessage.Freetext3 = '';
                mcdu.requestMessage.Freetext4 = '';
            }
            CDUAtcText.ShowPage1(mcdu, parent, false, false, false, false, false, false);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            mcdu.requestMessage = undefined;
            CDUAtcMenu.ShowPage(mcdu);
        };

        mcdu.rightInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[0] = () => {
            CDUAtcText.ShowPage1(mcdu, parent, false, true, false, false, false, false);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = () => {
            CDUAtcText.ShowPage1(mcdu, parent, false, false, false, true, false, false);
        };

        mcdu.rightInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[2] = () => {
            CDUAtcText.ShowPage1(mcdu, parent, false, false, false, false, false, true);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (parent || perf || med || wx || tech || turb || disc || CDUAtcText.SendableMessage(mcdu)) {
                mcdu.atsuManager.registerMessage(mcdu.requestMessage);
                mcdu.requestMessage = undefined;
                CDUAtcText.ShowPage1(mcdu, parent, false, false, false, false, false, false);
            } else {
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            }
        };

        mcdu.onNextPage = () => {
            CDUAtcText.ShowPage2(mcdu, parent, perf, med, wx, tech, turb, disc);
        };
    }

    static ShowPage2(mcdu, parent, perf, med, wx, tech, turb, disc) {
        mcdu.clearDisplay();

        let send = false;
        if (parent || perf || med || wx || tech || turb || disc || CDUAtcText.SendableMessage(mcdu)) {
            send = true;
        }

        let freetext1 = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (mcdu.requestMessage.Freetext1 !== "") {
            freetext1 = mcdu.requestMessage.Freetext1;
        }
        let freetext2 = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (mcdu.requestMessage.Freetext2 !== "") {
            freetext2 = mcdu.requestMessage.Freetext2;
        }
        let freetext3 = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (mcdu.requestMessage.Freetext3 !== "") {
            freetext3 = mcdu.requestMessage.Freetext3;
        }
        let freetext4 = "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan";
        if (mcdu.requestMessage.Freetext4 !== "") {
            freetext4 = mcdu.requestMessage.Freetext4;
        }

        mcdu.setTemplate([
            ["TEXT", "2", "2{"],
            [""],
            [freetext1],
            [""],
            [freetext2],
            [""],
            [freetext3],
            [""],
            [freetext4],
            ["\xa0ALL FIELDS"],
            [`${send ? "*" : "\xa0"}ERASE`],
            ["\xa0ATC MENU", `ATC ${parent}\xa0[color]cyan`],
            ["<RETURN", `TEXT DISPL${send ? "*" : "\xa0"}[color]cyan`]
        ], true);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = (value) => {
            if (value === FMCMainDisplay.clrValue || !value) {
                mcdu.requestMessage.Freetext1 = "";
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            } else {
                mcdu.requestMessage.Freetext1 = value;
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            }
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue || !value) {
                mcdu.requestMessage.Freetext2 = "";
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            } else {
                mcdu.requestMessage.Freetext2 = value;
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            }
        };

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue || !value) {
                mcdu.requestMessage.Freetext3 = "";
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            } else {
                mcdu.requestMessage.Freetext3 = value;
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            }
        };

        mcdu.leftInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue || !value) {
                mcdu.requestMessage.Freetext4 = "";
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            } else {
                mcdu.requestMessage.Freetext4 = value;
                CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
            }
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            if (!parent) {
                mcdu.requestMessage = undefined;
            } else {
                mcdu.requestMessage.Freetext0 = '';
                mcdu.requestMessage.Freetext1 = '';
                mcdu.requestMessage.Freetext2 = '';
                mcdu.requestMessage.Freetext3 = '';
                mcdu.requestMessage.Freetext4 = '';
            }
            CDUAtcText.ShowPage2(mcdu, parent, false, false, false, false, false, false);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            mcdu.requestMessage = undefined;
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (parent || perf || med || wx || tech || turb || disc || CDUAtcText.SendableMessage(mcdu)) {
                mcdu.atsuManager.registerMessage(mcdu.requestMessage);
                mcdu.requestMessage = undefined;
                CDUAtcText.ShowPage2(mcdu, parent, false, false, false, false, false, false);
            } else {
                CDUAtcText.ShowPage2(mcdu, parent, perf, med, wx, tech, turb, disc);
            }
        };

        mcdu.onPrevPage = () => {
            CDUAtcText.ShowPage1(mcdu, parent, perf, med, wx, tech, turb, disc);
        };
    }
}
