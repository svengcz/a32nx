class CDUAtcConnectionStatus {
    static ShowPage(mcdu, store = { "disconnectAvail": false }) {
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.ATCConnectionStatus;

        function updateView() {
            if (mcdu.page.Current === mcdu.page.ATCConnectionStatus) {
                CDUAtcConnectionStatus.ShowPage(mcdu);
            }
        }

        mcdu.refreshPageCallback = () => {
            updateView();
        };
        SimVar.SetSimVarValue("L:FMC_UPDATE_CURRENT_PAGE", "number", 1);

        let currentStation = "-----------[color]white";
        let atcDisconnect = "DISCONNECT\xa0[color]cyan";
        if (mcdu.atsu.atc.currentStation() !== "") {
            currentStation = `${mcdu.atsu.atc.currentStation()}[color]green`;
            atcDisconnect = "DISCONNECT*[color]cyan";
            store["disconnectAvail"] = true;
        } else {
            store["disconnectAvail"] = false;
        }

        let nextStation = "-----------";
        if (mcdu.atsu.atc.nextStation() !== "") {
            nextStation = `${mcdu.atsu.atc.nextStation()}[color]green`;
        }

        mcdu.setTemplate([
            ["CONNECTION STATUS"],
            ["\xa0ACTIVE ATC"],
            [currentStation],
            ["\xa0NEXT ATC", "ALL ATC\xa0[color]cyan"],
            [nextStation, atcDisconnect],
            [""],
            [""],
            ["-------ADS-C: ARMED-------"],
            ["\xa0SET OFF[color]inop"],
            [""],
            ["", "ADS-C DETAIL>[color]inop"],
            ["\xa0ATC MENU", ""],
            ["<RETURN", "NOTIFICATION>"]
        ]);

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = () => {
            if (!store["disconnectAvail"]) {
                mcdu.addNewMessage(NXSystemMessages.noAtc);
            } else {
                store["disconnectAvail"] = false;
                mcdu.atsu.atc.logoff().then((code) => {
                    if (code !== Atsu.AtsuStatusCodes.Ok) {
                        store["disconnectAvail"] = true;
                        mcdu.addNewAtsuMessage(code);
                    } else {
                        CDUAtcConnectionStatus.ShowPage(mcdu, store);
                    }
                });
            }
            CDUAtcConnectionStatus.ShowPage(mcdu, store);
        };
        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            CDUAtcConnectionNotification.ShowPage(mcdu);
        };
    }
}
