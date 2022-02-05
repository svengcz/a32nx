class CDUAtcVertRequest {
    static CreateDataBlock() {
        return {
            clb: null,
            des: null,
            startAt: null,
            alt: null,
            spd: null,
            whenHigher: false,
            whenLower: false,
            whenSpd: false,
            blockAltLow: null,
            blockAltHigh: null,
            cruise: null,
            spdLow: null,
            spdHigh: null,
            whenCruise: false,
            whenSpdRange: false
        };
    }

    static CanSendData(data) {
        return data.clb || data.des || data.startAt || data.alt || data.spd || data.whenHigher || data.whenLower ||
            data.whenSpd || data.blockAltLow || data.blockAltHigh || data.cruise || data.spdLow || data.spdHigh ||
            data.whenCruise || data.whenSpdRange;
    }

    static ValidateAltitude(value) {
        if (/^((FL)*[0-9]{1,3})$/.test(value)) {
            let flightlevel = "";

            if (value.startsWith("FL")) {
                flightlevel = value.substring(2, value.length);
            } else {
                flightlevel = value;
            }

            // contains not only digits
            if (/(?!^\d+$)^.+$/.test(flightlevel)) {
                return NXSystemMessages.formatError;
            }
            flightlevel = parseInt(flightlevel);

            if (flightlevel >= 30 && flightlevel <= 410) {
                return null;
            }
            return NXSystemMessages.entryOutOfRange;
        } else if (/^([0-9]{1,3}(FT|M)|[0-9]{1,5}M|[0-9]{4,5})$/.test(value)) {
            const feet = value[value.length - 1] !== "M";

            let altitude = value.replace("FT", "").replace("M", "");

            // contains not only digits
            if (/(?!^\d+$)^.+$/.test(altitude)) {
                return NXSystemMessages.formatError;
            }
            altitude = parseInt(altitude);

            if (feet) {
                if (altitude >= 0 && altitude <= 25000) {
                    return null;
                }
                return NXSystemMessages.entryOutOfRange;
            }

            if (altitude >= 0 && altitude <= 12500) {
                return null;
            }
            return NXSystemMessages.entryOutOfRange;
        }

        return NXSystemMessages.formatError;
    }

    static FormatAltitude(value) {
        if (/^((FL)*[0-9]{1,3})$/.test(value)) {
            if (value.startsWith("FL")) {
                return value;
            } else {
                return `FL${value}`;
            }
        } else if (/^([0-9]{1,3}(FT|M)|[0-9]{1,5}M|[0-9]{4,5})$/.test(value)) {
            const feet = value[value.length - 1] !== "M";

            let altitude = value.replace("FT", "").replace("M", "");
            if (!feet) {
                altitude = `${altitude}M`;
            }

            return altitude;
        }

        return "";
    }

    static ValidateSpeed(value) {
        if (/^((M*)\.[0-9]{1,2})$/.test(value)) {
            // MACH number

            let mach = value.split(".")[1];
            // contains not only digits
            if (/(?!^\d+$)^.+$/.test(mach)) {
                return NXSystemMessages.formatError;
            }
            mach = parseInt(mach);

            if (mach >= 61 && mach <= 92) {
                return null;
            }
            return NXSystemMessages.entryOutOfRange;
        } else if (/^([0-9]{1,3}(KT)*)$/.test(value)) {
            // knots

            let knots = value.replace("KT", "");
            // contains not only digits
            if (/(?!^\d+$)^.+$/.test(knots)) {
                return NXSystemMessages.formatError;
            }
            knots = parseInt(knots);

            if (knots >= 70 && knots <= 350) {
                return null;
            }
            return NXSystemMessages.entryOutOfRange;
        }

        return NXSystemMessages.formatError;
    }

    static FormatSpeed(value) {
        // remove preceeding M and succeeding KT
        return value.replace("M", "").replace("KT", "");
    }

        mcdu.clearDisplay();

        if (mcdu.requestMessage !== undefined && !dataSet) {
            mcdu.requestMessage = undefined;
        }

        mcdu.setTemplate([
            ["ATC VERT REQ", "1", "2"],
            ["\xa0CLB TO/START AT", "ALT\xa0"],
            ["[   ]/[   ][color]cyan", "[   ][color]cyan"],
            ["\xa0DES TO/START AT", "SPD\xa0"],
            ["[   ]/[   ][color]cyan", "[ ][color]cyan"],
            ["---WHEN CAN WE EXPECT---"],
            ["{cyan}{{end}HIGHER ALT", "LOWER ALT{cyan}}{end}"],
            ["", "WHEN CAN SPD\xa0"],
            ["", "[ ][color]cyan"],
            ["\xa0ALL FIELDS"],
            ["\xa0ERASE", "ADD TEXT>"],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", "REQ DISPLAY\xa0[color]cyan"]
        ]);

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcVertRequest.ShowPage1(mcdu, false);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            // TODO
            //if (dataSet) {
            //    CDUAtcLatRequest.CreateMessage(mcdu, dir, wxDev, sid, offset, offsetStart, hdg, trk, backOnTrack);
            //}
            CDUAtcText.ShowPage1(mcdu, "REQ", false);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (dataSet) {
                // TODO
                //CDUAtcLatRequest.CreateMessage(mcdu, dir, wxDev, sid, offset, offsetStart, hdg, trk, backOnTrack);
                mcdu.atsuManager.registerMessage(mcdu.requestMessage);
                mcdu.requestMessage = undefined;
                CDUAtcVertRequest.ShowPage1(mcdu, false);
            }
        };

        mcdu.onNextPage = () => {
            CDUAtcVertRequest.ShowPage2(mcdu, parent, false);
        };
    }

    static ShowPage2(mcdu, dataSet = false) {
        mcdu.clearDisplay();

        if (mcdu.requestMessage !== undefined && !dataSet) {
            mcdu.requestMessage = undefined;
        }

        mcdu.setTemplate([
            ["ATC VERT REQ", "2", "2"],
            ["\xa0BLOCK ALT", "VMC\xa0"],
            ["[   ]/[   ][color]cyan", "DESCENT{cyan}}{end}"],
            ["\xa0CRZ CLB TO", "SPD RANGE\xa0"],
            ["[   ][color]cyan", "[ ]/[ ][color]cyan"],
            [""],
            ["{small}---WHEN CAN WE EXPECT---{end}"],
            ["\xa0CRZ CLB TO", "SPD RANGE\xa0"],
            ["[   ][color]cyan", "[ ]/[ ][color]cyan"],
            ["\xa0ALL FIELDS"],
            ["\xa0ERASE", "ADD TEXT>"],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", "REQ DISPLAY\xa0[color]cyan"]
        ]);

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcVertRequest.ShowPage2(mcdu);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            // TODO
            //if (dataSet) {
            //    CDUAtcLatRequest.CreateMessage(mcdu, dir, wxDev, sid, offset, offsetStart, hdg, trk, backOnTrack);
            //}
            CDUAtcText.ShowPage1(mcdu, "REQ", false);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (dataSet) {
                // TODO
                //CDUAtcLatRequest.CreateMessage(mcdu, dir, wxDev, sid, offset, offsetStart, hdg, trk, backOnTrack);
                mcdu.atsuManager.registerMessage(mcdu.requestMessage);
                mcdu.requestMessage = undefined;
                CDUAtcVertRequest.ShowPage2(mcdu);
            }
        };

        mcdu.onPrevPage = () => {
            CDUAtcVertRequest.ShowPage1(mcdu, parent, false);
        };
    }
}
