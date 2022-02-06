class CDUAtcLatRequest {
    static CreateDataBlock() {
        return {
            dir: null,
            wxDev: null,
            sid: null,
            offset: null,
            offsetStart: null,
            hdg: null,
            trk: null,
            backOnTrack: false
        };
    }

    static CanSendData(mcdu, data) {
        if (mcdu.atsuManager.atc.currentStation() === "") {
            return false;
        }
        return data.dir || data.wxDev || data.sid || data.offset || data.hdg || data.trk || data.backOnTrack;
    }

    static TranslateOffset(offset) {
        let nmUnit = true;
        let left = false;
        let distance;

        if (/^[LR][0-9]{1,3}(NM|KM)$/.test(offset) || /^[LR][0-9]{1,3}$/.test(offset)) {
            // format: DNNNKM, DNNNNM, DNNN

            // contains not only numbers
            distance = offset.replace(/NM|KM/, "").replace(/L|R/, "");
            if (/(?!^\d+$)^.+$/.test(distance)) {
                return "";
            }

            distance = parseInt(distance);
            nmUnit = !offset.endsWith("KM");
            left = offset[0] === 'L';
        } else if (/[0-9]{1,3}(NM|KM)[LR]/.test(offset) || /[0-9]{1,3}[LR]/.test(offset)) {
            // format: NNNKMD, NNNNMD, NNND

            // contains not only numbers
            distance = offset.replace(/NM|KM/, "").replace(/L|R/, "");
            if (/(?!^\d+$)^.+$/.test(distance)) {
                return "";
            }

            distance = parseInt(distance);
            nmUnit = !(offset.endsWith("KML") || offset.endsWith("KMR"));
            left = offset[offset.length - 1] === 'L';
        }

        let retval = distance.toString();
        retval += nmUnit ? 'NM ' : 'KM ';
        retval += left ? 'LEFT' : 'RIGHT';

        return retval;
    }

    static CreateMessage(mcdu, data) {
        mcdu.requestMessage = new Atsu.RequestMessage();

        if (data.dir) {
            mcdu.requestMessage.Request = `REQUEST DIR TO ${data.dir}`;
        } else if (data.wxDev) {
            mcdu.requestMessage.Request = `REQUEST ${CDUAtcLatRequest.TranslateOffset(data.wxDev)} OF ROUTE`;
            mcdu.requestMessage.Reason = 'DUE TO WEATHER';
        } else if (data.sid) {
            mcdu.requestMessage.Request = `REQUEST ${data.sid} ROUTE`;
        } else if (data.offset) {
            mcdu.requestMessage.Request = `REQUEST ${CDUAtcLatRequest.TranslateOffset(data.offset)} OF ROUTE START `;
            if (data.offsetStart) {
                mcdu.requestMessage.Request += ` AT ${data.offsetStart}`;
            } else {
                mcdu.requestMessage.Request += ` NOW [${(new Atsu.AtsuTimestamp()).dcduTimestamp()}]`;
            }
        } else if (data.hdg) {
            if (data.hdg === 0) {
                mcdu.requestMessage.Request = "REQUEST HEADING 360";
            } else {
                mcdu.requestMessage.Request = `REQUEST HEADING ${data.hdg.toString()}`;
            }
        } else if (data.trk) {
            if (data.trk === 0) {
                mcdu.requestMessage.Request = "REQUEST GROUND TRACK 360";
            } else {
                mcdu.requestMessage.Request = `REQUEST GROUND TRACK ${data.trk.toString()}`;
            }
        } else if (data.backOnTrack) {
            mcdu.requestMessage.Request = "WHEN CAN WE EXPECT BACK ON ROUTE";
        } else {
            mcdu.requestMessage = undefined;
        }
    }

    static ShowPage(mcdu, data = CDUAtcLatRequest.CreateDataBlock()) {
        mcdu.clearDisplay();

        if (mcdu.atsuManager.atc.currentStation() === "") {
            mcdu.addNewMessage(NXSystemMessages.noAtc);
        }

        let wheaterDeviation = "{cyan}[  ]{end}";
        if (data.wxDev) {
            wheaterDeviation = `${data.wxDev}[color]cyan`;
        }
        let heading = "[ ]°[color]cyan";
        if (data.hdg !== null) {
            heading = `${data.hdg}°[color]cyan`;
        }
        let grdTrack = "[ ]°[color]cyan";
        if (data.trk !== null) {
            grdTrack = `${data.trk}°[color]cyan`;
        }
        let directTo = "{cyan}[     ]{end}";
        if (data.dir) {
            directTo = `${data.dir}[color]cyan`;
        }
        let sidStar = "{cyan}[   ]{end}";
        if (data.sid) {
            sidStar = `${data.sid}[color]cyan`;
        }
        let offsetDistance = "[  ]";
        if (data.offset) {
            offsetDistance = data.offset;
        }
        let offsetStartPoint = "[     ]";
        if (data.offsetStart) {
            offsetStartPoint = data.offsetStart;
        }

        let erase = "\xa0ERASE";
        let reqDisplay = "REQ DISPL\xa0[color]cyan";
        if (CDUAtcLatRequest.CanSendData(mcdu, data)) {
            erase = "*ERASE";
            reqDisplay = "REQ DISPL*[color]cyan";
        }

        mcdu.setTemplate([
            ["ATC LAT REQ"],
            ["\xa0DIR TO[color]white", "WX DEV UP TO\xa0[color]white"],
            [directTo, wheaterDeviation],
            ["\xa0SID", "OFFSET/START AT\xa0"],
            [sidStar, `{cyan}${offsetDistance}/${offsetStartPoint}{end}`],
            ["\xa0HEADING", "GROUND TRK\xa0"],
            [heading, grdTrack],
            ["", "WHEN CAN WE EXPECT\xa0"],
            ["", "BACK ON ROUTE{cyan}}{end}"],
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
                data.dir = null;
            } else if (value) {
                if (mcdu.isLatLonFormat(value)) {
                    // format: DDMM.MB/EEEMM.MC
                    try {
                        mcdu.parseLatLon(value);
                        data = CDUAtcLatRequest.CreateDataBlock();
                        data.dir = value;
                    } catch (err) {
                        if (err === NXSystemMessages.formatError) {
                            mcdu.addNewMessage(err);
                        }
                    };
                } else if (/^[A-Z0-9]{2,7}/.test(value)) {
                    // place format
                    mcdu.dataManager.GetWaypointsByIdent.bind(mcdu.dataManager)(value).then((waypoints) => {
                        if (waypoints.length === 0) {
                            mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                        } else {
                            data = CDUAtcLatRequest.CreateDataBlock();
                            data.dir = value;
                        }

                        CDUAtcLatRequest.ShowPage(mcdu, data);
                    });
                }
            }

            CDUAtcLatRequest.ShowPage(mcdu, data);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            if (mcdu.currentFlightPhase === FmgcFlightPhases.PREFLIGHT) {
                // requesting a SID
                if (mcdu.flightPlanManager.getOrigin() && mcdu.flightPlanManager.getOrigin().ident) {
                    mcdu.dataManager.GetWaypointsByIdent.bind(mcdu.dataManager)(mcdu.flightPlanManager.getOrigin().ident).then((waypoints) => {
                        if (waypoints.length === 0) {
                            mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                        } else if (waypoints[0].infos instanceof AirportInfo) {
                            const airportInfo = waypoints[0].infos;
                            if (airportInfo.departures.findIndex((sid) => sid.name === value) === -1) {
                                mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                            } else {
                                data = CDUAtcLatRequest.CreateDataBlock();
                                data.sid = value;
                            }

                            CDUAtcLatRequest.ShowPage(mcdu, data);
                        }
                    });
                }
            } else {
                // requesting an arrival
                if (mcdu.flightPlanManager.getDestination() && mcdu.flightPlanManager.getDestination().ident) {
                    mcdu.dataManager.GetWaypointsByIdent.bind(mcdu.dataManager)(mcdu.flightPlanManager.getDestination().ident).then((waypoints) => {
                        if (waypoints.length === 0) {
                            mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                        } else if (waypoints[0].infos instanceof AirportInfo) {
                            const airportInfo = waypoints[0].infos;
                            if (airportInfo.approaches.findIndex((star) => star.name === value) === -1) {
                                mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                            } else {
                                data = CDUAtcLatRequest.CreateDataBlock();
                                data.sid = value;
                            }

                            CDUAtcLatRequest.ShowPage(mcdu, data);
                        }
                    });
                }
            }

            CDUAtcLatRequest.ShowPage(mcdu, data);
        };

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.hdg = null;
            } else if (value) {
                if (/(?!^\d+$)^.+$/.test(value)) {
                    mcdu.addNewMessage(NXSystemMessages.formatError);
                } else {
                    const angle = parseInt(value);
                    if (angle >= 1 && angle <= 360) {
                        data = CDUAtcLatRequest.CreateDataBlock();
                        if (angle === 360) {
                            data.hdg = 0;
                        } else {
                            data.hdg = angle;
                        }
                    } else {
                        mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                    }
                }
            }

            CDUAtcLatRequest.ShowPage(mcdu, data);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcLatRequest.ShowPage(mcdu);
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
                data.wxDev = null;
            } else if (value) {
                const error = mcdu.validOffset(value);
                if (!error) {
                    data = CDUAtcLatRequest.CreateDataBlock();
                    data.wxDev = value;
                } else {
                    mcdu.addNewMessage(error);
                }
            }
            CDUAtcLatRequest.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = async (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.offset = null;
                data.offsetStart = null;
            } else if (value) {
                const entries = value.split('/');
                let updatedOffset = false;
                let offsetStart = null;
                let offset = null;

                const error = mcdu.validOffset(entries[0]);
                if (!error) {
                    updatedOffset = true;
                    offset = entries[0];
                    entries.shift();
                }

                if (entries.length !== 0) {
                    const startingPoint = entries.join("/");

                    mcdu.waypointType(mcdu, startingPoint).then((type) => {
                        if (offset || data.offset) {
                            switch (type[0]) {
                                case 0:
                                    offsetStart = startingPoint;
                                    break;
                                case 1:
                                    if (startingPoint.endsWith("Z")) {
                                        offsetStart = startingPoint;
                                    } else {
                                        offsetStart = `${startingPoint}Z`;
                                    }
                                    break;
                                case 2:
                                    offsetStart = startingPoint;
                                    break;
                                default:
                                    mcdu.addNewMessage(type[1]);
                                    offsetStart = null;
                                    if (updatedOffset) {
                                        offset = null;
                                    }
                                    break;
                            }
                        }

                        if (offset || offsetStart) {
                            const oldOffsetStart = data.offsetStart;
                            const oldOffset = data.offset;

                            data = CDUAtcLatRequest.CreateDataBlock();
                            data.offset = offset ? offset : oldOffset;
                            data.offsetStart = offsetStart ? offsetStart : oldOffsetStart;
                        }

                        CDUAtcLatRequest.ShowPage(mcdu, data);
                    });
                } else if (updatedOffset) {
                    data = CDUAtcLatRequest.CreateDataBlock();
                    data.offset = offset;
                } else if (error) {
                    mcdu.addNewMessage(error);
                }
            }

            CDUAtcLatRequest.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[2] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.trk = null;
            } else if (value) {
                if (/(?!^\d+$)^.+$/.test(value)) {
                    mcdu.addNewMessage(NXSystemMessages.formatError);
                } else {
                    const angle = parseInt(value);
                    if (angle >= 1 && angle <= 360) {
                        data = CDUAtcLatRequest.CreateDataBlock();
                        if (angle === 360) {
                            data.trk = 0;
                        } else {
                            data.trk = angle;
                        }
                    } else {
                        mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                    }
                }
            }

            CDUAtcLatRequest.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.backOnTrack = false;
            } else {
                data = CDUAtcLatRequest.CreateDataBlock();
                data.backOnTrack = true;
            }
            CDUAtcLatRequest.ShowPage(mcdu, data);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            let message = null;
            if (CDUAtcLatRequest.CanSendData(mcdu, data)) {
            }
            CDUAtcText.ShowPage1(mcdu, "REQ", false);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcLatRequest.CanSendData(mcdu, data)) {
                CDUAtcLatRequest.ShowPage(mcdu);
            }
        };
    }
}
