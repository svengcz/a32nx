class CDUAtcConnectionStatus {
    static ShowPage(mcdu, store = { "disconnectAvail": false }) {
        mcdu.clearDisplay();

        let currentStation = "____[color]amber";
        let atcDisconnect = "DISCONNECT\xa0[color]cyan";
        if (mcdu.atsuManager.atc.currentStation() !== '') {
            currentStation = `${mcdu.atsuManager.atc.currentStation()}[color]green`;
            atcDisconnect = "DISCONNECT*[color]cyan";
            store["disconnectAvail"] = true;
        } else {
            store["disconnectAvail"] = false;
        }

        let nextStation = "----";
        if (mcdu.atsuManager.atc.nextStation() !== '') {
            nextStation = `${mcdu.atsuManager.atc.nextStation()}[color]green`;
        }

        mcdu.setTemplate([
            ["CONNECTION STATUS"],
            ["ACTIVE ATC"],
            [currentStation],
            ["NEXT ATC", "ALL ATC\xa0[color]cyan"],
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
                mcdu.atsuManager.atc.logoff().then((code) => {
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
