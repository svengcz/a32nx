class CDUAocDepartReq {
    static ShowPage1(mcdu, store = { "sendStatus": "" }) {
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.AOCDepartRequest;

        if (mcdu.pdcMessage === undefined) {
            mcdu.pdcMessage = new Atsu.PdcMessage();
        }

        let flightNo = "______[color]amber";
        let fromTo = "____|____[color]amber";
        let station = "____[color]amber";
        const atis = new CDU_SingleValueField(mcdu,
            "string",
            mcdu.pdcMessage.Atis,
            {
                clearable: true,
                emptyValue: "_[color]amber",
                suffix: "[color]cyan",
                maxLength: 1,
                isValid: ((value) => {
                    return /^[A-Z()]*$/.test(value) === true;
                })
            },
            (value) => {
                mcdu.pdcMessage.Atis = value;
                CDUAocDepartReq.ShowPage1(mcdu, store);
            }
        );
        const gate = new CDU_SingleValueField(mcdu,
            "string",
            mcdu.pdcMessage.Gate,
            {
                clearable: true,
                emptyValue: "[\xa0\xa0\xa0\xa0][color]cyan",
                suffix: "[color]cyan",
                maxLength: 4
            },
            (value) => {
                mcdu.pdcMessage.Gate = value;
                CDUAocDepartReq.ShowPage1(mcdu, store);
            }
        );
        const freetext = new CDU_SingleValueField(mcdu,
            "string",
            mcdu.pdcMessage.Freetext0,
            {
                clearable: 0 === mcdu.pdcMessage.Freetext1.length,
                emptyValue: "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan",
                suffix: "[color]white",
                maxLength: 22
            },
            (value) => {
                mcdu.pdcMessage.Freetext0 = value;
                CDUAocDepartReq.ShowPage1(mcdu, store);
            }
        );

        // "1123" is the default ATC flight number
        if (SimVar.GetSimVarValue("ATC FLIGHT NUMBER", "string", "FMC") !== "1123" && mcdu.flightPlanManager.getOrigin() !== null) {
            mcdu.pdcMessage.Callsign = SimVar.GetSimVarValue("ATC FLIGHT NUMBER", "string", "FMC");
            flightNo = mcdu.pdcMessage.Callsign + "[color]green";
        }
        if (mcdu.flightPlanManager.getDestination() && mcdu.flightPlanManager.getDestination().ident) {
            mcdu.pdcMessage.Origin = mcdu.flightPlanManager.getOrigin().ident;
            mcdu.pdcMessage.Destination = mcdu.flightPlanManager.getDestination().ident;
            fromTo = mcdu.pdcMessage.Origin + "/" + mcdu.pdcMessage.Destination + "[color]cyan";
        }
        if (mcdu.pdcMessage.Station !== "") {
            station = `${mcdu.pdcMessage.Station}[color]cyan`;
        }

        // check if all required information are available to prepare the PDC message
        let reqDisplButton = "SEND\xa0[color]cyan";
        if (mcdu.pdcMessage.Callsign !== "" && mcdu.pdcMessage.Origin !== "" && mcdu.pdcMessage.Destination !== "" && mcdu.pdcMessage.Atis !== "" && mcdu.pdcMessage.Station !== "") {
            reqDisplButton = "SEND*[color]cyan";
        }

        mcdu.setTemplate([
            ["DEPART REQ"],
            ["\xa0ATC FLT NBR", "A/C TYPE\xa0"],
            [flightNo, "A20N[color]cyan"],
            ["\xa0FROM/TO", "ATIS\xa0"],
            [fromTo, atis],
            ["\xa0GATE", "STATION\xa0"],
            [gate, station],
            ["---------FREE TEXT---------"],
            [freetext],
            ["", "MORE\xa0"],
            ["", "FREE TEXT>[color]white"],
            ["\xa0AOC MENU", store["sendStatus"]],
            ["<RETURN", reqDisplButton]
        ]);

        mcdu.rightInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[2] = (value) => {
            if (value.length !== 4 || /^[A-Z()]*$/.test(value) === false) {
                mcdu.addNewMessage(NXSystemMessages.formatError);
                CDUAocDepartReq.ShowPage1(mcdu, store);
            } else if (SimVar.GetSimVarValue("ATC FLIGHT NUMBER", "string", "FMC") === "1123") {
                mcdu.addNewMessage(NXFictionalMessages.fltNbrMissing);
                CDUAocDepartReq.ShowPage1(mcdu, store);
            } else {
                mcdu.atsuManager.isRemoteStationAvailable(value).then((code) => {
                    if (code !== Atsu.AtsuStatusCodes.Ok) {
                        mcdu.addNewAtsuMessage(code);
                        mcdu.pdcMessage.Station = "";
                    } else {
                        mcdu.pdcMessage.Station = value;
                    }

                    if (mcdu.page.Current === mcdu.page.AOCDepartRequest) {
                        CDUAocDepartReq.ShowPage1(mcdu, store);
                    }
                });
            }
        };
        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            if (0 !== mcdu.pdcMessage.Freetext0.length) {
                CDUAocDepartReq.ShowPage2(mcdu);
            } else {
                mcdu.addNewMessage(NXSystemMessages.mandatoryFields);
            }
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAocMenu.ShowPage(mcdu);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (mcdu.pdcMessage.Callsign === "" || mcdu.pdcMessage.Origin === "" || mcdu.pdcMessage.Destination === "" || mcdu.pdcMessage.Atis === "" || mcdu.pdcMessage.Station === "") {
                mcdu.addNewMessage(NXSystemMessages.mandatoryFields);
                return;
            }

            store["sendStatus"] = "SENDING";
            CDUAocDepartReq.ShowPage1(mcdu, store);

            // publish the message
            mcdu.atsuManager.sendMessage(mcdu.pdcMessage).then((code) => {
                if (code === Atsu.AtsuStatusCodes.Ok) {
                    mcdu.pdcMessage = undefined;
                    store["sendStatus"] = "SENT";
                    CDUAocDepartReq.ShowPage1(mcdu, store);

                    setTimeout(() => {
                        store["sendStatus"] = "";
                        if (mcdu.page.Current === mcdu.page.AOCDepartRequest) {
                            CDUAocDepartReq.ShowPage1(mcdu, store);
                        }
                    }, 5000);
                } else {
                    mcdu.addNewAtsuMessage(code);
                    store["sendStatus"] = "FAILED";
                    CDUAocDepartReq.ShowPage1(mcdu, store);
                }
            });
        };
    }

    static ShowPage2(mcdu) {
        mcdu.clearDisplay();

        const additionalLineTemplate = [
            ["FREE TEXT"],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            ["\xa0DEPART REQUEST"],
            ["<RETURN"]
        ];

        // find the first empty line
        let firstEmptyLineIndex = -1;
        if (0 === mcdu.pdcMessage.Freetext5.length) {
            firstEmptyLineIndex = 4;
        }
        if (0 === mcdu.pdcMessage.Freetext4.length) {
            firstEmptyLineIndex = 3;
        }
        if (0 === mcdu.pdcMessage.Freetext3.length) {
            firstEmptyLineIndex = 2;
        }
        if (0 === mcdu.pdcMessage.Freetext2.length) {
            firstEmptyLineIndex = 1;
        }
        if (0 === mcdu.pdcMessage.Freetext1.length) {
            firstEmptyLineIndex = 0;
        }

        switch (firstEmptyLineIndex) {
            case -1:
            case 4:
                const line4 = new CDU_SingleValueField(mcdu,
                    "string",
                    mcdu.pdcMessage.Freetext5,
                    {
                        clearable: 0 !== mcdu.pdcMessage.Freetext5.length,
                        emptyValue: "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan",
                        suffix: "[color]white",
                        maxLength: 22
                    },
                    (value) => {
                        mcdu.pdcMessage.Freetext5 = value;
                        CDUAocDepartReq.ShowPage2(mcdu);
                    }
                );
                additionalLineTemplate[10] = [line4];
            case 3:
                const line3 = new CDU_SingleValueField(mcdu,
                    "string",
                    mcdu.pdcMessage.Freetext4,
                    {
                        clearable: 0 === mcdu.pdcMessage.Freetext5.length,
                        emptyValue: "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan",
                        suffix: "[color]white",
                        maxLength: 22
                    },
                    (value) => {
                        mcdu.pdcMessage.Freetext4 = value;
                        CDUAocDepartReq.ShowPage2(mcdu);
                    }
                );
                additionalLineTemplate[8] = [line3];
            case 2:
                const line2 = new CDU_SingleValueField(mcdu,
                    "string",
                    mcdu.pdcMessage.Freetext3,
                    {
                        clearable: 0 === mcdu.pdcMessage.Freetext4.length,
                        emptyValue: "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan",
                        suffix: "[color]white",
                        maxLength: 22
                    },
                    (value) => {
                        mcdu.pdcMessage.Freetext3 = value;
                        CDUAocDepartReq.ShowPage2(mcdu);
                    }
                );
                additionalLineTemplate[6] = [line2];
            case 1:
                const line1 = new CDU_SingleValueField(mcdu,
                    "string",
                    mcdu.pdcMessage.Freetext2,
                    {
                        clearable: 0 === mcdu.pdcMessage.Freetext3.length,
                        emptyValue: "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan",
                        suffix: "[color]white",
                        maxLength: 22
                    },
                    (value) => {
                        mcdu.pdcMessage.Freetext2 = value;
                        CDUAocDepartReq.ShowPage2(mcdu);
                    }
                );
                additionalLineTemplate[4] = [line1];
            default:
                const line0 = new CDU_SingleValueField(mcdu,
                    "string",
                    mcdu.pdcMessage.Freetext1,
                    {
                        clearable: 0 === mcdu.pdcMessage.Freetext2.length,
                        emptyValue: "[\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0][color]cyan",
                        suffix: "[color]white",
                        maxLength: 22
                    },
                    (value) => {
                        mcdu.pdcMessage.Freetext1 = value;
                        CDUAocDepartReq.ShowPage2(mcdu);
                    }
                );
                additionalLineTemplate[2] = [line0];
                break;
        }

        // define the template
        mcdu.setTemplate(additionalLineTemplate);

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAocDepartReq.ShowPage1(mcdu);
        };
    }
}
