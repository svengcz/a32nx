class CDUAtcLatRequest {
    static TranslateOffset(offset) {
        let nmUnit = true;
        let distance = 0;
        let left = false;

        if (/[LR][0-9]{1,3}(NM|KM)/.test(offset) || /[LR][0-9]{1,3}/.test(offset)) {
            // format: DNNNKM, DNNNNM, DNNN
            distance = parseInt(offset.substring(1, 4));
            nmUnit = !offset.endsWith("KM");
            left = offset[0] === 'L';
        } else if (/[0-9]{1,3}(NM|KM)[LR]/.test(offset) || /[0-9]{1,3}[LR]/.test(offset)) {
            // format: NNNKMD, NNNNMD, NNND
            distance = parseInt(offset.substring(0, 3));
            nmUnit = !(offset.endsWith("KML") || offset.endsWith("KMR"));
            left = offset[offset.length - 1] === 'L';
        }

        let retval = distance.toString();
        retval += nmUnit ? 'NM ' : 'KM ';
        retval += left ? 'LEFT' : 'RIGHT';

        return retval;
    }

    static CreateMessage(mcdu, dir, wxDev, sid, offset, offsetStart, hdg, trk, backOnTrack) {
        mcdu.requestMessage = new Atsu.RequestMessage();

        if (dir) {
            mcdu.requestMessage.Request = `REQUEST DIR TO ${dir}`;
        } else if (wxDev) {
            mcdu.requestMessage.Request = `REQUEST ${CDUAtcLatRequest.TranslateOffset(wxDev)} OF ROUTE DUE TO WEATHER`;
        } else if (sid) {
            mcdu.requestMessage.Request = `REQUEST ${wxDev} ROUTE`;
        } else if (offset) {
            mcdu.requestMessage.Request = `REQUEST ${CDUAtcLatRequest.TranslateOffset(offset)} OF ROUTE START `;
            if (offsetStart) {
                mcdu.requestMessage.Request += ` AT ${offsetStart}`;
            } else {
                mcdu.requestMessage.Request += ` NOW [${(new Atsu.AtsuTimestamp()).dcduTimestamp()}]`;
            }
        } else if (hdg) {
            if (hdg === 0) {
                mcdu.requestMessage.Request = "REQUEST HEADING 360";
            } else {
                mcdu.requestMessage.Request = `REQUEST HEADING ${hdg.toString()}`;
            }
        } else if (trk) {
            if (hdg === 0) {
                mcdu.requestMessage.Request = "REQUEST GROUND TRACK 360";
            } else {
                mcdu.requestMessage.Request = `REQUEST GROUND TRACK ${hdg.toString()}`;
            }
        } else if (backOnTrack) {
            mcdu.requestMessage.Request = "WHEN CAN WE EXPECT BACK ON ROUTE";
        } else {
            mcdu.requestMessage = undefined;
        }
    }

    static ShowPage(mcdu, dir = null, wxDev = null, sid = null, offset = null, offsetStart = null, hdg = null, trk = null, backOnTrack = false, dataSet = false) {
        mcdu.clearDisplay();

        if (mcdu.requestMessage !== undefined && !dataSet) {
            mcdu.requestMessage = undefined;
        }

        const wheaterDeviation = new CDU_SingleValueField(mcdu,
            "string",
            wxDev,
            {
                clearable: true,
                emptyValue: "{cyan}[  ]{end}",
                suffix: "[color]cyan",
                isValid: ((value) => mcdu.validOffset(value))
            },
            (value) => {
                if (value === FMCMainDisplay.clrValue || !value) {
                    wxDev = undefined;
                    CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, null, null, false, false);
                } else {
                    wxDev = value;
                    CDUAtcLatRequest.ShowPage(mcdu, null, wxDev, null, null, null, null, null, false, true);
                }
            }
        );
        const heading = new CDU_SingleValueField(mcdu,
            "int",
            hdg,
            {
                clearable: true,
                emptyValue: "[ ]°",
                suffix: "°[color]white",
                minValue: 1,
                maxValue: 360
            },
            (value) => {
                if (value === FMCMainDisplay.clrValue || !value) {
                    hdg = undefined;
                    CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, null, null, false, false);
                } else {
                    if (value === 360) {
                        value = 0;
                    }
                    hdg = value;
                    CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, hdg, null, false, true);
                }
            }
        );
        const grdTrack = new CDU_SingleValueField(mcdu,
            "int",
            trk,
            {
                clearable: true,
                emptyValue: "{cyan}[ ]°{end}",
                suffix: "°[color]cyan",
                minValue: 1,
                maxValue: 360
            },
            (value) => {
                if (value === FMCMainDisplay.clrValue || !value) {
                    trk = undefined;
                    CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, null, null, false, false);
                } else {
                    if (value === 360) {
                        value = 0;
                    }
                    trk = value;
                    CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, null, trk, false, true);
                }
            }
        );

        let directTo = "{cyan}[     ]{end}";
        if (dir) {
            directTo = `${dir}[color]cyan`;
        }

        let sidStar = "{cyan}[   ]{end}";
        if (sid) {
            sidStar = `${sid}[color]cyan`;
        }

        let offsetDistance = "[  ]";
        if (offset) {
            offsetDistance = offset;
        }
        let offsetStartPoint = "[     ]";
        if (offsetStart) {
            offsetStartPoint = offsetStart;
        }

        let erase = "\xa0ERASE";
        if (dataSet) {
            erase = "*ERASE";
        }

        let reqDisplay = "REQ DISPL\xa0[color]cyan";
        if (dataSet) {
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
            if (mcdu.isLatLonFormat(value)) {
                // format: DDMM.MB/EEEMM.MC
                try {
                    mcdu.parseLatLon(value);
                    dir = value;
                    CDUAtcLatRequest.ShowPage(mcdu, dir, null, null, null, null, null, null, false, true);
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
                        dir = null;
                    } else {
                        dir = value;
                    }

                    CDUAtcLatRequest.ShowPage(mcdu, dir, null, null, null, null, null, null, false, dir !== null);
                });
            } else if (value === FMCMainDisplay.clrValue || value === null) {
                dir = null;
                CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, null, null, false, false);
            }
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
                                sid = null;
                            } else {
                                sid = value;
                            }

                            CDUAtcLatRequest.ShowPage(mcdu, null, null, sid, null, null, null, null, false, sid !== null);
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
                            if (airportInfo.approaches.findIndex((sid) => sid.name === value) === -1) {
                                mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                                sid = null;
                            } else {
                                sid = value;
                            }

                            CDUAtcLatRequest.ShowPage(mcdu, null, null, sid, null, null, null, null, false, sid !== null);
                        }
                    });
                }
            }
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, null, null, false, false);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage(mcdu);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = async (value) => {
            const entries = value.split('/');

            if (value === FMCMainDisplay.clrValue || !value) {
                offset = null;
                offsetStart = null;
            } else {
                let updatedOffset = false;

                if (mcdu.validOffset(entries[0])) {
                    updatedOffset = true;
                    offset = entries[0];
                    entries.shift();
                }

                if (entries.length !== 0) {
                    const startingPoint = entries.join("/");

                    mcdu.waypointType(mcdu, startingPoint).then((type) => {
                        if (offset) {
                            switch (type) {
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
                                    mcdu.addNewMessage(NXSystemMessages.formatError);
                                    offsetStart = null;
                                    if (updatedOffset) {
                                        offset = null;
                                    }
                                    break;
                            }
                        }

                        CDUAtcLatRequest.ShowPage(mcdu, null, null, null, offset, offsetStart, null, null, true, true);
                    });
                }
            }

            CDUAtcLatRequest.ShowPage(mcdu, null, null, null, offset, offsetStart, null, null, true, true);
        };

        mcdu.rightInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[3] = () => {
            backOnTrack = true;
            CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, null, null, backOnTrack, true);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            if (dataSet) {
                CDUAtcLatRequest.CreateMessage(mcdu, dir, wxDev, sid, offset, offsetStart, hdg, trk, backOnTrack);
            }
            CDUAtcText.ShowPage1(mcdu, "REQ");
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (dataSet) {
                CDUAtcLatRequest.CreateMessage(mcdu, dir, wxDev, sid, offset, offsetStart, hdg, trk, backOnTrack);
                mcdu.atsuManager.registerMessage(mcdu.requestMessage);
                mcdu.requestMessage = undefined;
                CDUAtcLatRequest.ShowPage(mcdu, null, null, null, null, null, null, null, false, false);
            }
        };
    }
}
