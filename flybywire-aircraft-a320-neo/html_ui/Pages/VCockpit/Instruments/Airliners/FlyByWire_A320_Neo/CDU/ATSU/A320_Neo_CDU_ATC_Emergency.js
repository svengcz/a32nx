class CDUAtcEmergency {
    static ShowPage1(mcdu) {
        mcdu.clearDisplay();

        mcdu.setTemplate([
            ["EMERGENCY[color]amber", "1", "2"],
            ["", "EMERG ADS-C:OFF\xa0"],
            ["{cyan}{{end}MAYDAY", "SET ON*[color]inop"],
            ["", "DESCENDING TO\xa0"],
            ["{cyan}{{end}PANPAN", "[    ][color]cyan"],
            ["", "DIVERTING/VIA\xa0"],
            ["", "[   ]/[   ][color]cyan"],
            ["\xa0VOICE", "FREQ\xa0"],
            ["{cyan}{{end}CONTACT------", "[        ][color]cyan"],
            ["\xa0ALL FIELDS"],
            ["*ERASE", "ADD TEXT>"],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", "EMERG DISPL*[color]cyan"]
        ]);

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcEmergency.ShowPage(mcdu);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.onNextPage = () => {
            CDUAtcEmergency.ShowPage2(mcdu);
        };
    }

    static ShowPage2(mcdu) {
        mcdu.clearDisplay();

        mcdu.setTemplate([
            ["EMERGENCY[color]amber", "2", "2"],
            ["\xa0CLBING TO", "OFFSETTING\xa0"],
            ["[    ][color]cyan", "[  ][color]cyan"],
            ["\xa0SOULS", "ENDURANCE\xa0"],
            ["[ ][color]cyan", "[     ][color]cyan"],
            [""],
            ["{cyan}{{end}EMERGENCY CANCEL", ""],
            [""],
            [""],
            ["\xa0ALL FIELDS"],
            ["*ERASE", "ADD TEXT>"],
            ["\xa0ATC MENU", "ATC\xa0[color]cyan"],
            ["<RETURN", "EMERG DISPL*[color]cyan"]
        ]);

        mcdu.leftInputDelay[4] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[4] = () => {
            CDUAtcEmergency.ShowPage(mcdu);
        };

        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDUAtcMenu.ShowPage1(mcdu);
        };

        mcdu.onPrevPage = () => {
            CDUAtcEmergency.ShowPage1(mcdu);
        };
    }
}
