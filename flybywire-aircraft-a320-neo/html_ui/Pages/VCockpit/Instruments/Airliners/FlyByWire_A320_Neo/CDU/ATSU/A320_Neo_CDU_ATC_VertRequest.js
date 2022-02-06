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

    static CanSendData(mcdu, data) {
        if (mcdu.atsuManager.atc.currentStation() === "") {
            return false;
        }
        return data.clb || data.des || data.startAt || data.alt || data.spd || data.whenHigher || data.whenLower ||
            data.whenSpd || data.blockAltLow || data.blockAltHigh || data.cruise || data.spdLow || data.spdHigh ||
            data.whenCruise || data.whenSpdRange || data.vmcDescend;
    }

    static CanEraseData(data) {
        return data.clb || data.des || data.startAt || data.alt || data.spd || data.whenHigher || data.whenLower ||
            data.whenSpd || data.blockAltLow || data.blockAltHigh || data.cruise || data.spdLow || data.spdHigh ||
            data.whenCruise || data.whenSpdRange || data.vmcDescend;
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

            const error = mcdu.validateAltitude(entries[0]);
            if (!error) {
                updateAlt = true;
                altitude = mcdu.formatAltitude(entries[0]);
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

    static SameAltitudeType(first, second) {
        if (first.startsWith("FL") && second.startsWith("FL")) {
            return true;
        } else if (first.startsWith("FL") || second.startsWith("FL")) {
            return false;
        } else if ((first[first.length - 1] === "M" && second[second.length - 1] === "M") || (first[first.length - 1] !== "M" && second[second.length - 1] !== "M")) {
            return true;
        }
        return false;
    }

    static ConvertToFeet(value) {
        if (value.startsWith("FL")) {
            return parseInt(value.substring(2, value.length)) * 100;
        } else if (value[value.length - 1] === "M") {
            return parseInt(value.substring(0, value.length - 1)) * 3.28;
        } else {
            return parseInt(value);
        }
    }

    static CreateMessage(data) {
        const retval = new Atsu.RequestMessage();

        if (data.clb) {
            retval.Request = `REQUEST CLIMB TO ${data.clb}`;
            if (data.startAt) {
                retval.Request += `START AT ${data.startAt}`;
            }
        } else if (data.des) {
            retval.Request = `REQUEST DESCENT TO ${data.des}`;
            if (data.startAt) {
                retval.Request += `START AT ${data.startAt}`;
            }
        } else if (data.alt) {
            retval.Request = `REQUEST ${!data.alt.startsWith("FL") ? " ALTITUDE " : ""} ${data.alt}`;
        } else if (data.spd) {
            if (data.whenSpd) {
                retval.Request = `WHEN CAN WE EXPECT SPEED ${data.spd}`;
            } else {
                retval.Request = `REQUEST SPEED ${data.spd}`;
            }
        } else if (data.whenHigher) {
            retval.Request = `WHEN CAN WE EXPECT HIGHER ${Simplane.getPressureSelectedMode(Aircraft.A320_NEO) === "STD" ? "FLIGHTLEVEL" : "ALTITUDE"}`;
        } else if (data.whenLower) {
            retval.Request = `WHEN CAN WE EXPECT LOWER ${Simplane.getPressureSelectedMode(Aircraft.A320_NEO) === "STD" ? "FLIGHTLEVEL" : "ALTITUDE"}`;
        } else if (data.blockAltLow && data.blockAltHigh) {
            const fl = data.blockAltLow.startsWith("FL");
            retval.Request = `REQUEST ${fl ? "FLIGHTLEVEL" : "ALTITUDE"} BETWEEN ${data.blockAltLow} AND ${data.blockAltHigh}`;
        } else if (data.vmcDescend) {
            retval.Request = "REQUEST VMC DESCENT";
        } else if (data.cruise) {
            if (data.whenCruise) {
                retval.Request = `WHEN CAN WE EXPECT CRUISE CLIMB TO ${data.cruise}`;
            } else {
                retval.Request = `REQUEST CRUISE CLIMB TO ${data.cruise}`;
            }
        } else if (data.spdLow && data.spdHigh) {
            if (data.whenSpdRange) {
                retval.Request = `WHEN CAN WE EXPECT SPEED BETWEEN ${data.spdLow} AND ${data.spdHigh}`;
            } else {
                retval.Request = `REQUEST SPEED BETWEEN ${data.spdLow} AND ${data.spdHigh}`;
            }
        } else {
            retval = null;
        }

        return retval;
    }

    static ShowPage1(mcdu, data = CDUAtcVertRequest.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.atsuManager.atc.currentStation() === "") {
            mcdu.addNewMessage(NXSystemMessages.noAtc);
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
        let higherAlt = "{cyan}{{end}HIGHER ALT";
        if (data.whenHigher) {
            higherAlt = "\xa0HIGHER ALT[color]cyan";
        }
        let lowerAlt = "LOWER ALT{cyan}}{end}";
        if (data.whenLower) {
            lowerAlt = "LOWER ALT\xa0[color]cyan";
        }

        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPLAY\xa0[color]cyan";
        if (CDUAtcVertRequest.CanSendData(mcdu, data)) {
            reqDisplay = "REQ DISPLAY*[color]cyan";
        }
        if (CDUAtcVertRequest.CanEraseData(data)) {
            erase = "*ERASE";
        }

        mcdu.setTemplate([
            ["ATC VERT REQ", "1", "2"],
            ["\xa0CLB TO/START AT", "ALT\xa0"],
            [clbStart, alt],
            ["\xa0DES TO/START AT", "SPD\xa0"],
            [desStart, spd],
            ["---WHEN CAN WE EXPECT---"],
            [higherAlt, lowerAlt],
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
                const error = mcdu.validateAltitude(value);
                if (!error) {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.alt = mcdu.formatAltitude(value);
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
                const error = mcdu.validateSpeed(value);
                if (!error) {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.spd = mcdu.formatSpeed(value);
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
                const error = mcdu.validateSpeed(value);
                if (error) {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.spd = mcdu.formatSpeed(value);
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
            let message = null;
            if (CDUAtcVertRequest.CanSendData(mcdu, data)) {
                message = CDUAtcVertRequest.CreateMessage(data);
            }
            CDUAtcText.ShowPage1(mcdu, "REQ", message);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcVertRequest.CanSendData(mcdu, data)) {
                const message = CDUAtcVertRequest.CreateMessage(data);
                if (message) {
                    mcdu.atsuManager.registerMessage(message);
                }
                CDUAtcVertRequest.ShowPage1(mcdu);
            }
        };

        mcdu.onNextPage = () => {
            CDUAtcVertRequest.ShowPage2(mcdu, data);
        };
    }

    static ShowPage2(mcdu, data = CDUAtcVertRequest.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.atsuManager.atc.currentStation() === "") {
            mcdu.addNewMessage(NXSystemMessages.noAtc);
        }

        let blockAlt = "[   ]/[   ][color]cyan";
        if (data.blockAltLow && data.blockAltHigh) {
            blockAlt = `${data.blockAltLow}/${data.blockAltHigh}[color]cyan`;
        }
        let crzClimb = "[   ][color]cyan";
        if (data.cruise && !data.whenCruise) {
            crzClimb = `${data.cruise}[color]cyan`;
        }
        let crzClimbWhen = "[   ][color]cyan";
        if (data.cruise && data.whenCruise) {
            crzClimbWhen = `${data.cruise}[color]cyan`;
        }

        let spdRange = "[ ]/[ ][color]cyan";
        if (data.spdLow && data.spdHigh && !data.whenSpdRange) {
            spdRange = `${data.spdLow}/${data.spdHigh}[color]cyan`;
        }
        let spdRangeWhen = "[ ]/[ ][color]cyan";
        if (data.spdLow && data.spdHigh && data.whenSpdRange) {
            spdRangeWhen = `${data.spdLow}/${data.spdHigh}[color]cyan`;
        }
        let vmc = "VMC\xa0";
        let vmcDesc = "DESCENT{cyan}}{end}";
        if (data.vmcDescend) {
            vmc = "VMC\xa0[color]cyan";
            vmcDesc = "DESCENT\xa0[color]cyan";
        }

        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPLAY\xa0[color]cyan";
        if (CDUAtcVertRequest.CanSendData(mcdu, data)) {
            reqDisplay = "REQ DISPLAY*[color]cyan";
        }
        if (CDUAtcVertRequest.CanEraseData(data)) {
            erase = "*ERASE";
        }

        mcdu.setTemplate([
            ["ATC VERT REQ", "2", "2"],
            ["\xa0BLOCK ALT", vmc],
            [blockAlt, vmcDesc],
            ["\xa0CRZ CLB TO", "SPD RANGE\xa0"],
            [crzClimb, spdRange],
            [""],
            ["{small}---WHEN CAN WE EXPECT---{end}"],
            ["\xa0CRZ CLB TO", "SPD RANGE\xa0"],
            [crzClimbWhen, spdRangeWhen],
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
                data.blockAltLow = null;
                data.blockAltHigh = null;
            } else if (value) {
                const entries = value.split("/");
                if (entries.length !== 2) {
                    mcdu.addNewMessage(NXSystemMessages.formatError);
                } else if (mcdu.validateAltitude(entries[0]) || mcdu.validateAltitude(entries[1])) {
                    let error = mcdu.validateAltitude(entries[0]);
                    if (error) {
                        mcdu.addNewMessage(error);
                    } else {
                        error = mcdu.validateAltitude(entries[1]);
                        mcdu.addNewMessage(error);
                    }
                } else {
                    const lowerStr = mcdu.formatAltitude(entries[0]);
                    const higherStr = mcdu.formatAltitude(entries[1]);
                    const lower = CDUAtcVertRequest.ConvertToFeet(lowerStr);
                    const higher = CDUAtcVertRequest.ConvertToFeet(higherStr);

                    if (!CDUAtcVertRequest.SameAltitudeType(lowerStr, higherStr)) {
                        mcdu.addNewMessage(NXSystemMessages.formatError);
                    } else if (lower >= higher) {
                        mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                    } else {
                        data = CDUAtcVertRequest.CreateDataBlock();
                        data.blockAltLow = lowerStr;
                        data.blockAltHigh = higherStr;
                    }
                }
            }

            CDUAtcVertRequest.ShowPage2(mcdu, data);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                if (!data.whenCruise) {
                    data.cruise = null;
                }
            } else if (value) {
                const error = mcdu.validateAltitude(value);
                if (error) {
                    mcdu.addNewMessage(error);
                } else {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.cruise = mcdu.formatAltitude(value);
                }
            }
            CDUAtcVertRequest.ShowPage2(mcdu, data);
        };

        mcdu.leftInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.cruise = null;
                data.whenCruise = false;
            } else if (value) {
                const error = mcdu.validateAltitude(value);
                if (error) {
                    mcdu.addNewMessage(error);
                } else {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.cruise = mcdu.formatAltitude(value);
                    data.whenCruise = true;
                }
            }
            CDUAtcVertRequest.ShowPage2(mcdu, data);
        };

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

        mcdu.rightInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[0] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.vmcDescend = false;
            } else {
                data = CDUAtcVertRequest.CreateDataBlock();
                data.vmcDescend = true;
            }
            CDUAtcVertRequest.ShowPage2(mcdu, data);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                if (!data.whenSpdRange) {
                    data.spdLow = null;
                    data.spdHigh = null;
                }
            } else if (value) {
                const range = mcdu.validateSpeedRanges(value);
                if (range.length === 2) {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.spdLow = range[0];
                    data.spdHigh = range[1];
                }
            }
            CDUAtcVertRequest.ShowPage2(mcdu, data);
        };

        mcdu.rightInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                if (data.whenSpdRange) {
                    data.spdLow = null;
                    data.spdHigh = null;
                    data.whenSpdRange = false;
                }
            } else if (value) {
                const range = mcdu.validateSpeedRanges(value);
                if (range.length === 2) {
                    data = CDUAtcVertRequest.CreateDataBlock();
                    data.spdLow = range[0];
                    data.spdHigh = range[1];
                    data.whenSpdRange = true;
                }
            }
            CDUAtcVertRequest.ShowPage2(mcdu, data);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            let message = null;
            if (CDUAtcVertRequest.CanSendData(mcdu, data)) {
                message = CDUAtcVertRequest.CreateMessage(data);
            }
            CDUAtcText.ShowPage1(mcdu, "REQ", message);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcVertRequest.CanSendData(mcdu, data)) {
                const message = CDUAtcVertRequest.CreateMessage(data);
                if (message) {
                    mcdu.atsuManager.registerMessage(message);
                }
                CDUAtcVertRequest.ShowPage2(mcdu);
            }
        };

        mcdu.onPrevPage = () => {
            CDUAtcVertRequest.ShowPage1(mcdu, data);
        };
    }
}
