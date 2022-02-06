class CDUAtcWhenCanWe {
    static CreateDataBlock() {
        return {
            spd: null,
            whenHigher: false,
            whenLower: false,
            cruise: null,
            spdLow: null,
            spdHigh: null,
            backOnRoute: false
        };
    }

    static CanSendData(mcdu, data) {
        if (mcdu.atsuManager.atc.currentStation() === "") {
            return false;
        }
        return data.spd || data.whenLower || data.whenHigher || data.cruise || data.spdLow || data.spdHigh || data.backOnRoute;
    }

    static CanEraseData(data) {
        return data.spd || data.whenLower || data.whenHigher || data.cruise || data.spdLow || data.spdHigh || data.backOnRoute;
    }

    static CreateMessage(data) {
        const retval = new Atsu.RequestMessage();

        if (data.spd) {
            retval.Request = `WHEN CAN WE EXPECT SPEED ${data.spd}`;
        } else if (data.whenHigher) {
            retval.Request = `WHEN CAN WE EXPECT HIGHER ${Simplane.getPressureSelectedMode(Aircraft.A320_NEO) === "STD" ? "FLIGHTLEVEL" : "ALTITUDE"}`;
        } else if (data.whenLower) {
            retval.Request = `WHEN CAN WE EXPECT LOWER ${Simplane.getPressureSelectedMode(Aircraft.A320_NEO) === "STD" ? "FLIGHTLEVEL" : "ALTITUDE"}`;
        } else if (data.cruise) {
            retval.Request = `WHEN CAN WE EXPECT CRUISE CLIMB TO ${data.cruise}`;
        } else if (data.spdLow && data.spdHigh) {
            retval.Request = `WHEN CAN WE EXPECT SPEED BETWEEN ${data.spdLow} AND ${data.spdHigh}`;
        } else if (data.backOnRoute) {
            retval.Request = "WHEN CAN WE EXPECT BACK ON ROUTE";
        } else {
            retval = null;
        }

        return retval;
    }

    static ShowPage(mcdu, data = CDUAtcWhenCanWe.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.atsuManager.atc.currentStation() === "") {
            mcdu.addNewMessage(NXSystemMessages.noAtc);
        }

        let crzClimb = "[   ][color]cyan";
        if (data.cruise) {
            crzClimb = `${data.cruise}[color]cyan`;
        }
        let spd = "[ ][color]cyan";
        if (data.spd) {
            spd = `${data.spd}[color]cyan`;
        }
        let spdRange = "[ ]/[ ][color]cyan";
        if (data.spdLow && data.spdHigh) {
            spdRange = `${data.spdLow}/${data.spdHigh}[color]cyan`;
        }
        let higherAlt = "{cyan}{{end}HIGHER ALT";
        if (data.whenHigher) {
            higherAlt = "\xa0HIGHER ALT[color]cyan";
        }
        let lowerAlt = "LOWER ALT{cyan}}{end}";
        if (data.whenLower) {
            lowerAlt = "LOWER ALT\xa0[color]cyan";
        }
        let backOnRoute = "BACK ON ROUTE{cyan}}{end}";
        if (data.backOnRoute) {
            backOnRoute = "BACK ON ROUTE\xa0[color]cyan";
        }

        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPLAY\xa0[color]cyan";
        if (CDUAtcWhenCanWe.CanSendData(mcdu, data)) {
            reqDisplay = "REQ DISPLAY*[color]cyan";
        }
        if (CDUAtcWhenCanWe.CanEraseData(data)) {
            erase = "*ERASE";
        }

        mcdu.setTemplate([
            ["WHEN CAN WE\nEXPECT"],
            [""],
            [higherAlt, lowerAlt],
            ["\xa0CRZ CLB TO", "SPEED\xa0"],
            [crzClimb, spd],
            ["", "SPEED RANGE\xa0"],
            ["", spdRange],
            [""],
            ["", backOnRoute],
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
                data.whenHigher = false;
            } else {
                data = CDUAtcWhenCanWe.CreateDataBlock();
                data.whenHigher = true;
            }
            CDUAtcWhenCanWe.ShowPage(mcdu, data);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.cruise = null;
            } else if (value) {
                const error = mcdu.validateAltitude(value);
                if (error) {
                    mcdu.addNewMessage(error);
                } else {
                    data = CDUAtcWhenCanWe.CreateDataBlock();
                    data.cruise = mcdu.formatAltitude(value);
                }
            }
            CDUAtcWhenCanWe.ShowPage(mcdu, data);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcWhenCanWe.ShowPage(mcdu);
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
                data.whenLower = false;
            } else {
                data = CDUAtcWhenCanWe.CreateDataBlock();
                data.whenLower = true;
            }
            CDUAtcWhenCanWe.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.spd = null;
            } else if (value) {
                const error = mcdu.validateSpeed(value);
                if (!error) {
                    data = CDUAtcWhenCanWe.CreateDataBlock();
                    data.spd = mcdu.formatSpeed(value);
                } else {
                    mcdu.addNewMessage(error);
                }
            }
            CDUAtcWhenCanWe.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                if (!data.whenSpdRange) {
                    data.spdLow = null;
                    data.spdHigh = null;
                }
            } else if (value) {
                const range = mcdu.validateSpeedRanges(value);
                if (range.length === 2) {
                    data = CDUAtcWhenCanWe.CreateDataBlock();
                    data.spdLow = range[0];
                    data.spdHigh = range[1];
                }
            }
            CDUAtcWhenCanWe.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.backOnRoute = false;
            } else {
                data = CDUAtcWhenCanWe.CreateDataBlock();
                data.backOnRoute = true;
            }
            CDUAtcWhenCanWe.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            let message = null;
            if (CDUAtcWhenCanWe.CanSendData(mcdu, data)) {
                message = CDUAtcWhenCanWe.CreateMessage(data);
            }
            CDUAtcText.ShowPage1(mcdu, "REQ", message);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcWhenCanWe.CanSendData(mcdu, data)) {
                const message = CDUAtcWhenCanWe.CreateMessage(data);
                if (message) {
                    mcdu.atsuManager.registerMessage(message);
                }
                CDUAtcWhenCanWe.ShowPage(mcdu);
            }
        };
    }
}
