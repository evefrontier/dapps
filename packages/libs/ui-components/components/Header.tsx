import React, { ReactNode, useEffect, useState } from "react";
import {
  Identicon1,
  Identicon10,
  Identicon11,
  Identicon12,
  Identicon13,
  Identicon14,
  Identicon15,
  Identicon16,
  Identicon2,
  Identicon3,
  Identicon4,
  Identicon5,
  Identicon6,
  Identicon7,
  Identicon8,
  Identicon9,
} from "../assets";

import { abbreviateAddress, CharacterInfo } from "@evefrontier/dapp-kit";
import ClickToCopy from "./ClickToCopy";
import { ConnectWallet } from "../assets";
const Header = React.memo(
  ({
    connected,
    handleDisconnect,
    walletAddress,
    userCharacter,
  }: {
    connected: boolean;
    handleDisconnect: () => void;
    walletAddress: string;
    userCharacter: CharacterInfo | null;
  }) => {
    const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
    const [identicon, setIdenticon] = useState<number>(1);

    useEffect(() => {
      // If wallet has been previously connected
      const identiconNumber = localStorage.getItem("eve-dapp-identicon");
      if (identiconNumber) {
        setIdenticon(Number(identiconNumber));
      } else {
        const randomNumber = Math.floor(Math.random() * 16) + 1;
        localStorage.setItem("eve-dapp-identicon", randomNumber.toString());
        setIdenticon(randomNumber);
      }
    }, []);

    const identiconStyles = "w-[30px] h-[30px] text-neutral";

    const identiconMap: Record<number, ReactNode> = {
      1: <Identicon1 className={identiconStyles} />,
      2: <Identicon2 className={identiconStyles} />,
      3: <Identicon3 className={identiconStyles} />,
      4: <Identicon4 className={identiconStyles} />,
      5: <Identicon5 className={identiconStyles} />,
      6: <Identicon6 className={identiconStyles} />,
      7: <Identicon7 className={identiconStyles} />,
      8: <Identicon8 className={identiconStyles} />,
      9: <Identicon9 className={identiconStyles} />,
      10: <Identicon10 className={identiconStyles} />,
      11: <Identicon11 className={identiconStyles} />,
      12: <Identicon12 className={identiconStyles} />,
      13: <Identicon13 className={identiconStyles} />,
      14: <Identicon14 className={identiconStyles} />,
      15: <Identicon15 className={identiconStyles} />,
      16: <Identicon16 className={identiconStyles} />,
    };

    return (
      <header
        className={`flex w-full items-center py-6 px-2 lg:px-0`}
        id="header"
      >
        {connected && (
          <div className="flex w-full justify-between items-center">
            <div className="!p-0">
              <ConnectWallet className="mx-auto my-auto h-10 w-10" />
            </div>
            <div className="relative">
              <div className="w-8 h-full !p-0">{identiconMap[identicon]}</div>
              <div className="header-text">
                <span
                  className="capitalize flex flex-row items-center"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span id="char-name-addr" className="cursor-pointer">
                    {userCharacter?.name || abbreviateAddress(walletAddress)}
                  </span>
                  <ClickToCopy text={walletAddress} />
                </span>
                <div
                  id="menu-dropdown"
                  className={`absolute right-0 ${dropdownOpen ? "!block" : "!hidden"}`}
                >
                  <div className="menu-dropdown-item">
                    {abbreviateAddress(walletAddress)}
                  </div>
                  <div
                    className="menu-dropdown-item cursor-pointer"
                    onClick={handleDisconnect}
                  >
                    Sign out
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  },
);

export default React.memo(Header);
