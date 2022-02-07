class CDUAtcEmergency {
    static CreateDataBlock(oldData = null) {
        return {
            mayday: oldData ? oldData.mayday : false,
            panpan: oldData ? oldData.panpan : false,
            contactVoice: false,
            descend: null,
            diversion: null,
            via: null,
            frequency: null,
            climb: null,
            offset: null,
            souls: oldData ? oldData.souls : null,
            endurance: oldData ? oldData.endurance : null
        };
    }

    static CanSendData(mcdu, data) {
        if (mcdu.atsuManager.atc.currentStation() === "") {
            return false;
        }
        if (data.mayday || data.panpan) {
            return data.contactVoice || data.descend || data.diversion || data.via || data.frequency || data.climb || data.offset || data.souls || data.endurance;
        }
        return false;
    }

    static CanEraseData(data) {
        return data.mayday || data.panpan || data.contactVoice || data.descend || data.diversion || data.via || data.frequency || data.climb || data.offset || data.souls || data.endurance;
    }

    static CreateMessage(data) {
        const retval = new Atsu.EmergencyMessage();

        if (data.mayday) {
            retval.Level = "MAYDAY MAYDAY MAYDAY";
        } else if (data.panpan) {
            retval.Level = "PAN PAN PAN";
        }

        if (data.contactVoice && data.frequency) {
            retval.Request = `REQUEST VOICE CONTACT ON ${data.frequency}`;
        } else if (data.descend) {
            retval.Request = `DESCENDING TO ${data.descend}`;
        } else if (data.diversion) {
            if (data.via) {
                retval.Request = `DIVERTING TO ${data.diversion} VIA ${data.via}`;
            } else {
                retval.Request = `DIVERTING TO ${data.diversion}`;
            }
        } else if (data.climb) {
            retval.Request = `CLIMBING TO ${!data.alt.startsWith("FL") ? " ALTITUDE " : ""} ${data.alt}`;
        } else if (data.offset) {
            retval.Request = `OFFSETING ${mcdu.translateOffset(data.offset)} OF ROUTE`;
        } else {
            retval = null;
        }

        if (retval && data.souls && data.endurance) {
            retval.SoulsAndEndurance = `SOULS: ${data.souls} ENDURANCE: ${data.endurance}`;
        }

        return retval;
    }

    static ShowPage1(mcdu, data = CDUAtcEmergency.CreateDataBlock()) {
        mcdu.clearDisplay();

        let mayday = "{cyan}{{end}MAYDAY";
        if (data.mayday) {
            mayday = "\xa0MAYDAY[color]cyan";
        }
        let panpan = "{cyan}{{end}PANPAN";
        if (data.panpan) {
            panpan = "\xa0PANPAN[color]cyan";
        }
        let descending = "[    ][color]cyan";
        if (data.descend) {
            descending = `${data.descend}[color]cyan`;
        }
        let voice = "\xa0VOICE";
        let contact = "{cyan}{{end}CONTACT------";
        if (data.contactVoice) {
            voice = "\xa0VOICE[color]cyan";
            contact = "\xa0CONTACT------[color]cyan";
        }
        let frequency = "[        ][color]cyan";
        if (data.frequency) {
            frequency = `${data.frequency}[color]cyan`;
        }

        let text = "ADD TEXT\xa0";
        let erase = "\xa0ERASE";
        let emergDisplay = "EMERG DISPL\xa0[color]cyan";
        if (CDUAtcEmergency.CanEraseData(data)) {
            erase = "*ERASE";
        }
        if (CDUAtcEmergency.CanSendData(mcdu, data)) {
            emergDisplay = "EMERG DISPL*[color]cyan";
            text = "ADD TEXT>";
        }

        mcdu.setTemplate([
            ["EMERGENCY[color]amber", "1", "2"],
            ["", "EMERG ADS-C:OFF\xa0"],
            [mayday, "SET ON*[color]inop"],
            ["", "DESCENDING TO\xa0"],
            [panpan, descending],
            ["", "DIVERTING/VIA\xa0"],
            ["", "[   ]/[   ][color]cyan"],
            [voice, "FREQ\xa0"],
            [contact, frequency],
            ["\xa0ALL FIELDS"],
            [erase, text],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", emergDisplay]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = () => {
            data.mayday = true;
            data.panpan = false;
            CDUAtcEmergency.ShowPage1(mcdu, data);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = () => {
            data.mayday = false;
            data.panpan = true;
            CDUAtcEmergency.ShowPage1(mcdu, data);
        };

        mcdu.leftInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[3] = () => {
            const freq = data.frequency;
            data = CDUAtcEmergency.CreateDataBlock(data);
            data.contactVoice = true;
            data.frequency = freq;
            CDUAtcEmergency.ShowPage1(mcdu, data);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcEmergency.ShowPage1(mcdu);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.descend = null;
            } else if (value) {
                const error = mcdu.validateAltitude(value);
                if (!error) {
                    data = CDUAtcEmergency.CreateDataBlock(data);
                    data.descend = mcdu.formatAltitude(value);
                } else {
                    mcdu.addNewMessage(error);
                }
            }
            CDUAtcEmergency.ShowPage1(mcdu, data);
        };

        mcdu.rightInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[3] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.frequency = null;
            } else if (value) {
                const error = mcdu.validateFrequency(value);
                if (error) {
                    mcdu.addNewMessage(error);
                } else {
                    const voiceRequest = data.contactVoice;
                    data = CDUAtcEmergency.CreateDataBlock(data);
                    data.contactVoice = voiceRequest;
                    data.frequency = value;
                }
            }
            CDUAtcEmergency.ShowPage1(mcdu, data);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            if (CDUAtcEmergency.CanSendData(mcdu, data)) {
                const message = CDUAtcEmergency.CreateMessage(data);
                if (message) {
                    CDUAtcText.ShowPage1(mcdu, "EMERG", message);
                }
            }
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcEmergency.CanSendData(mcdu, data)) {
                const message = CDUAtcEmergency.CreateMessage(data);
                if (message) {
                    mcdu.atsuManager.registerMessage(message);
                }
                CDUAtcEmergency.ShowPage1(mcdu);
            }
        };

        mcdu.onNextPage = () => {
            CDUAtcEmergency.ShowPage2(mcdu, data);
        };
    }

    static ShowPage2(mcdu, data = CDUAtcEmergency.CreateDataBlock()) {
        mcdu.clearDisplay();

        let emergCancel = "\xa0EMERGENCY CANCEL[color]cyan";
        if (data.mayday || data.panpan) {
            emergCancel = "{cyan}{{end}EMERGENCY CANCEL";
        }
        let climbing = "[    ][color]cyan";
        if (data.climb) {
            climbing = `${data.climb}[color]cyan`;
        }
        let offset = "[  ][color]cyan";
        if (data.offset) {
            offset = `${data.offset}[color]cyan`;
        }
        let souls = "[ ][color]cyan";
        if (data.souls) {
            souls = `${data.souls}[color]cyan`;
        }
        let endurance = "[     ][color]cyan";
        if (data.endurance) {
            endurance = `${data.endurance}[color]cyan`;
        }

        let text = "ADD TEXT\xa0";
        let erase = "\xa0ERASE";
        let emergDisplay = "EMERG DISPL\xa0[color]cyan";
        if (CDUAtcEmergency.CanEraseData(data)) {
            erase = "*ERASE";
        }
        if (CDUAtcEmergency.CanSendData(mcdu, data)) {
            emergDisplay = "EMERG DISPL*[color]cyan";
            text = "ADD TEXT>";
        }

        mcdu.setTemplate([
            ["EMERGENCY[color]amber", "2", "2"],
            ["\xa0CLBING TO", "OFFSETTING\xa0"],
            [climbing, offset],
            ["\xa0SOULS", "ENDURANCE\xa0"],
            [souls, endurance],
            [""],
            [emergCancel, ""],
            [""],
            [""],
            ["\xa0ALL FIELDS"],
            [erase, text],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", emergDisplay]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.climb = null;
            } else if (value) {
                const error = mcdu.validateAltitude(value);
                if (!error) {
                    data = CDUAtcEmergency.CreateDataBlock(data);
                    data.climb = mcdu.formatAltitude(value);
                } else {
                    mcdu.addNewMessage(error);
                }
            }
            CDUAtcEmergency.ShowPage2(mcdu, data);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.souls = null;
                data.endurance = null;
            } else if (value) {
                // not only digits
                if (/(?!^\d+$)^.+$/.test(value)) {
                    mcdu.addNewMessage(NXSystemMessages.formatError);
                } else {
                    souls = parseInt(value);
                    if (value < 1 || value > 1024) {
                        mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                    } else {
                        data.souls = value;
                        if (!data.endurance) {
                            data.endurance = "0H 00";
                        }
                    }
                }
            }

            CDUAtcEmergency.ShowPage2(mcdu, data);
        };

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = () => {
            data.mayday = false;
            data.panpan = false;
            CDUAtcEmergency.ShowPage2(mcdu, data);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcEmergency.ShowPage2(mcdu);
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
                data.offset = null;
            } else if (value) {
                const error = mcdu.validOffset(value);
                if (!error) {
                    data = CDUAtcEmergency.CreateDataBlock(data);
                    data.offset = value;
                } else {
                    mcdu.addNewMessage(error);
                }
            }
            CDUAtcEmergency.ShowPage2(mcdu, data);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = (value) => {
            if (value === FMCMainDisplay.clrValue) {
                data.souls = null;
                data.endurance = null;
            } else if (value) {
                // not HHMM
                if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                    mcdu.addNewMessage(NXSystemMessages.formatError);
                } else {
                    const hours = parseInt(value.substring(0, 2));
                    const minutes = value.substring(2, 4);
                    data.endurance = `${hours}H ${minutes}`;
                    if (!data.souls) {
                        data.souls = "999";
                    }
                }
            }

            CDUAtcEmergency.ShowPage2(mcdu, data);
        };

        mcdu.rightInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[4] = () => {
            if (CDUAtcEmergency.CanSendData(mcdu, data)) {
                const message = CDUAtcEmergency.CreateMessage(data);
                if (message) {
                    CDUAtcText.ShowPage1(mcdu, "EMERG", message);
                }
            }
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            if (CDUAtcEmergency.CanSendData(mcdu, data)) {
                const message = CDUAtcEmergency.CreateMessage(data);
                if (message) {
                    mcdu.atsuManager.registerMessage(message);
                }
                CDUAtcEmergency.ShowPage2(mcdu);
            }
        };

        mcdu.onPrevPage = () => {
            CDUAtcEmergency.ShowPage1(mcdu, data);
        };
    }
}
