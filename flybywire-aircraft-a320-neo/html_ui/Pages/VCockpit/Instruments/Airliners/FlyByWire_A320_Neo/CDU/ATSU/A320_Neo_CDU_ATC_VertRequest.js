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
            vmcDescend: false,
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

    static HandleClbDestStart(mcdu, value, data, climbRequest) {
        if (value === FMCMainDisplay.clrValue || !value) {
            if (climbRequest) {
                data.clb = null;
            } else {
                data.des = null;
            }
            data.startAt = null;
        } else {
            const entries = value.split('/');
            let updateAlt = false;
            let altitude = null;
            let start = null;

            const error = CDUAtcVertRequest.ValidateAltitude(entries[0]);
            if (!error) {
                updateAlt = true;
                altitude = CDUAtcVertRequest.FormatAltitude(entries[0]);
                entries.shift();
            }

            if (entries.length !== 0) {
                const startingPoint = entries.join("/");

                mcdu.waypointType(mcdu, startingPoint).then((type) => {
                    if (altitude || (data.clb && climbRequest || data.des && !climbRequest)) {
                        switch (type[0]) {
                            case 0:
                                start = startingPoint;
                                break;
                            case 1:
                                if (startingPoint.endsWith("Z")) {
                                    start = startingPoint;
                                } else {
                                    start = `${startingPoint}Z`;
                                }
                                break;
                            case 2:
                                start = startingPoint;
                                break;
                            default:
                                mcdu.addNewMessage(type[1]);
                                start = null;
                                if (updateAlt) {
                                    altitude = null;
                                }
                                break;
                        }
                    }

                    if (altitude || start) {
                        if (altitude && start) {
                            // complete new entry
                            data = CDUAtcVertRequest.CreateDataBlock();
                            data.startAt = start;
                            if (climbRequest) {
                                data.clb = altitude;
                            } else {
                                data.des = altitude;
                            }
                        } else if (altitude) {
                            // update the altitude and keep the start at
                            const lastStart = data.startAt;
                            data = CDUAtcVertRequest.CreateDataBlock();
                            data.startAt = lastStart;
                            if (climbRequest) {
                                data.clb = altitude;
                            } else {
                                data.des = altitude;
                            }
                        } else if (start && (data.clb || data.des)) {
                            // update start at if clb or des are set
                            data.startAt = start;
                        }
                    }

                    CDUAtcVertRequest.ShowPage1(mcdu, data);
                });
            } else if (updateAlt) {
                data = CDUAtcVertRequest.CreateDataBlock();
                if (climbRequest) {
                    data.clb = altitude;
                } else {
                    data.des = altitude;
                }
            } else if (error) {
                mcdu.addNewMessage(error);
            }
        }

        CDUAtcVertRequest.ShowPage1(mcdu, data);
    }

    static ShowPage1(mcdu, data = CDUAtcVertRequest.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.requestMessage !== undefined) {
            mcdu.requestMessage = undefined;
        }

        let clbStart = "[   ]/[   ][color]cyan";
        if (data.clb) {
            clbStart = `${data.clb}/${data.startAt ? data.startAt : "[   ]"}[color]cyan`;
        }
        let desStart = "[   ]/[   ][color]cyan";
        if (data.des) {
            desStart = `${data.des}/${data.startAt ? data.startAt : "[   ]"}[color]cyan`;
        }

        let alt = "[   ][color]cyan";
        if (data.alt) {
            alt = `${data.alt}[color]cyan`;
        }
        let spd = "[ ][color]cyan";
        if (data.spd && !data.whenSpd) {
            spd = `${data.spd}[color]cyan`;
        }
        let spdWhen = "[ ][color]cyan";
        if (data.spd && data.whenSpd) {
            spdWhen = `${data.spd}[color]cyan`;
        }

        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPLAY\xa0[color]cyan";
        if (CDUAtcVertRequest.CanSendData(data)) {
            erase = "*ERASE";
            reqDisplay = "REQ DISPLAY*[color]cyan";
        }

        mcdu.setTemplate([
            ["ATC VERT REQ", "1", "2"],
            ["\xa0CLB TO/START AT", "ALT\xa0"],
            [clbStart, alt],
            ["\xa0DES TO/START AT", "SPD\xa0"],
            [desStart, spd],
            ["---WHEN CAN WE EXPECT---"],
            ["{cyan}{{end}HIGHER ALT", "LOWER ALT{cyan}}{end}"],
            ["", "WHEN CAN SPD\xa0"],
            ["", spdWhen],
            ["\xa0ALL FIELDS"],
            [erase, "ADD TEXT>"],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", reqDisplay]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = (value) => {
            CDUAtcVertRequest.HandleClbDestStart(mcdu, value, data, true);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            CDUAtcVertRequest.HandleClbDestStart(mcdu, value, data, false);
        };

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.whenHigher = false;
            } else {
                data = CDUAtcVertRequest.CreateDataBlock();
                data.whenHigher = true;
            }
            CDUAtcVertRequest.ShowPage1(mcdu, data);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcVertRequest.ShowPage1(mcdu);
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
                data.alt = null;
            } else if (value) {
                const error = CDUAtcVertRequest.ValidateAltitude(value);
                if (!error) {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.alt = CDUAtcVertRequest.FormatAltitude(value);
                } else {
                    mcdu.addNewMessage(error);
                }
            }
            CDUAtcVertRequest.ShowPage1(mcdu, data);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.spd = null;
            } else if (value) {
                const error = CDUAtcVertRequest.ValidateSpeed(value);
                if (!error) {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.spd = CDUAtcVertRequest.FormatSpeed(value);
                } else {
                    mcdu.addNewMessage(error);
                }
            }
            CDUAtcVertRequest.ShowPage1(mcdu, data);
        };

        mcdu.rightInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.whenLower = false;
            } else {
                data = CDUAtcVertRequest.CreateDataBlock();
                data.whenLower = true;
            }
            CDUAtcVertRequest.ShowPage1(mcdu, data);
        };

        mcdu.rightInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.spd = null;
                data.whenSpd = false;
            } else if (value) {
                const error = CDUAtcVertRequest.ValidateSpeed(value);
                if (error) {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.spd = CDUAtcVertRequest.FormatSpeed(value);
                    data.whenSpd = true;
                } else {
                    mcdu.addNewMessage(NXSystemMessages.formatError);
                }
            }
            CDUAtcVertRequest.ShowPage1(mcdu, data);
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
                CDUAtcVertRequest.ShowPage1(mcdu);
            }
        };

        mcdu.onNextPage = () => {
            CDUAtcVertRequest.ShowPage2(mcdu, data);
        };
    }

    static ShowPage2(mcdu, data = CDUAtcVertRequest.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.requestMessage !== undefined) {
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
            CDUAtcVertRequest.ShowPage1(mcdu, data);
        };
    }
}
