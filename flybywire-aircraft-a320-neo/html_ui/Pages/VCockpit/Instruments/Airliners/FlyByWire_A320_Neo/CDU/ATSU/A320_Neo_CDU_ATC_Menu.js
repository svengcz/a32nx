class CDUAtcMenu {
    static ShowPage1(mcdu) {
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.ATCMenu;
        mcdu.setTemplate([
            ["ATC MENU", "1", "2"],
            [""],
            ["<LAT REQ[color]white", "VERT REQ>[color]white"],
            [""],
            ["<WHEN CAN WE[color]white", "OTHER REQ>[color]white"],
            [""],
            ["", "TEXT>[color]white"],
            [""],
            ["<MSG RECORD", "REPORTS>[color]inop"],
            [""],
            ["<CONNECTION", ""],
            ["\xa0ATSU DLK"],
            ["<RETURN", "EMERGENCY>[color]amber"]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = () => {
            CDUAtcLatRequest.ShowPage(mcdu);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = () => {
            CDUAtcWhenCanWe.ShowPage(mcdu);
        };

        mcdu.leftInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[3] = () => {
            CDUAtcMessagesRecord.ShowPage(mcdu);
        };

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcConnection.ShowPage(mcdu);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtsuMenu.ShowPage(mcdu);
        };

        mcdu.rightInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[0] = () => {
            CDUAtcVertRequest.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[1] = () => {
            CDUAtcOtherRequest.ShowPage(mcdu);
        };

        mcdu.rightInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[2] = () => {
            CDUAtcText.ShowPage1(mcdu);
        };

        mcdu.rightInputDelay[3] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[3] = () => {
            //CDUAtcReports.ShowPage(mcdu);
        };

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            CDUAtcEmergency.ShowPage1(mcdu);
        };

        mcdu.onPrevPage = () => {
            CDUAtcMenu.ShowPage2(mcdu);
        };
        mcdu.onNextPage = () => {
            CDUAtcMenu.ShowPage2(mcdu);
        };
    }

    static ShowPage2(mcdu) {
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.ATCMenu;
        mcdu.setTemplate([
            ["ATC MENU", "2", "2"],
            ["--------ATS623 PAGE--------"],
            ["<DEPART REQ", "ATIS>"],
            ["", ""],
            ["<OCEANIC REQ", ""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            ["\xa0ATSU DLK"],
            ["<RETURN"]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = () => {
            CDUAtcDepartReq.ShowPage1(mcdu);
        };

        mcdu.leftInputDelay[1] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[1] = () => {
            CDUAtcOceanicReq.ShowPage1(mcdu);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtsuMenu.ShowPage(mcdu);
        };

        mcdu.rightInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[0] = () => {
            CDUAtcAtisMenu.ShowPage(mcdu);
        };

        mcdu.onPrevPage = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };
        mcdu.onNextPage = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };
    }
}
