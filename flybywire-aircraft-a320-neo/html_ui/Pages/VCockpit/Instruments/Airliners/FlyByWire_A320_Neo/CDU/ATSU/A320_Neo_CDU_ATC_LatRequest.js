class CDUAtcLatRequest {
    static ShowPage(mcdu) {
        mcdu.clearDisplay();

        mcdu.setTemplate([
            ["ATC LAT REQ"],
            ["\xa0DIR TO[color]white", "WX DEV UP TO\xa0[color]white"],
            ["{cyan}[       ]{end}", "{cyan}[   ]{end}"],
            ["\xa0SID", "OFFSET/START AT\xa0"],
            ["{cyan}[    ]{end}","{cyan}[    ]/[       ]{end}"],
            ["\xa0HEADING", "GROUND TRK\xa0"],
            ["[   ]°", "{cyan}[   ]°{end}"],
            ["", "WHEN CAN WE EXPECT\xa0"],
            ["", "BACK ON ROUTE{cyan}}{end}"],
            ["\xa0ALL FIELDS"],
            ["\xa0ERASE", "ADD TEXT\xa0"],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", "REQ DISPL\xa0[color]cyan"]
        ]);

        mcdu.leftInputDelay[0] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[0] = () => {
            //CDUAtcRequest.ShowPage(mcdu);
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
            //CDUAtcEmergency.ShowPage(mcdu);
        };

        mcdu.onPrevPage = () => {
            CDUAtcMenu.ShowPage2(mcdu);
        };
        mcdu.onNextPage = () => {
            CDUAtcMenu.ShowPage2(mcdu);
        };
    }
}
