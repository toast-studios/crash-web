import { Container, Sprite, Text } from "pixi.js";
import {
  LobbyFormatContainer,
  LobbyFormatConfig,
} from "./LobbyFormatContainer.js";
import { LobbyWinAmountView } from "./LobbyWinAmountView.js";
import { RankGroup } from "./RankGroup.js";
import { Lobby } from "../store/storeTypes.js";
import {
  CURRENCY_CODES,
  CURRENCY_UI_MAPPING,
  LOBBY_FORMAT,
} from "../types/index.js";
import { formatCurrency } from "../utils/currency.js";
import gsap from "gsap";
import {
  localStorageUtil,
  LOCAL_STORAGE_KEYS,
} from "../utils/localStorageUtil.js";
import { sfx } from "../utils/audio.js";
import { CurrencyDisplay } from "../ui/CurrencyDisplay.js";

export class LobbySelection extends Container {
  public background: Sprite;
  public lobbyFormatContainers: LobbyFormatContainer[] = [];
  public lobbyFormatsWrapper: Container;

  public title: Text;
  public lobbyWinAmountView: LobbyWinAmountView;
  public lobbyWinAmountAndEntryFeeSplitter: Sprite;
  public entryFeeContainer: Container;
  public entryFee: Text;
  public entryFeeAmountContainer: Container;
  public entryFeeInDollar: Text;
  public entryFeeCurrencySymbol: Container;
  public entryFeeCurrencyGroup: Container;
  public entryFeeCurrencyDisplay?: CurrencyDisplay;
  public entryFeeAndRankGroupSplitter: Sprite;
  public rankGroup: RankGroup;
  public scrollBoxContainer: Container;
  public noLobbiesMessage: Text;

  private lobbies: Lobby[] = [];
  private filteredLobbies: Lobby[] = [];
  private selectedLobby: Lobby | undefined = undefined;
  private currentLobbyIndex: number = 0;
  private activeCurrency: CURRENCY_CODES;
  private activeLobbyFormat: LOBBY_FORMAT | undefined = undefined;

  // Layout spacing constants
  private readonly SPACING_WITH_RANK_GROUP = 8; // Current style
  private readonly SPACING_WITHOUT_RANK_GROUP = 30; // More padding when no rank group

  constructor(
    lobbies: Lobby[],
    activeCurrency: CURRENCY_CODES,
    selectedLobby?: Lobby,
  ) {
    super();

    this.lobbies = lobbies;
    this.selectedLobby = selectedLobby;
    this.activeCurrency = activeCurrency;

    this.background = Sprite.from("lobby-selection-container-background");
    this.background.width = this.background.width / 2;
    this.background.height = this.background.height / 2;

    this.lobbyFormatsWrapper = new Container();
    this.addChild(this.lobbyFormatsWrapper);

    // Dynamically initialize lobby format containers based on lobbies
    this.initializeLobbyFormats();

    this.addChild(this.background);

    this.title = new Text({
      text: "Prize Pool",
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fill: 0xffffff,
        align: "center",
        fontWeight: "400",
      },
    });
    this.addChild(this.title);

    this.lobbyWinAmountAndEntryFeeSplitter = Sprite.from("splitter");
    this.lobbyWinAmountAndEntryFeeSplitter.width =
      this.lobbyWinAmountAndEntryFeeSplitter.width / 2;
    this.lobbyWinAmountAndEntryFeeSplitter.height =
      this.lobbyWinAmountAndEntryFeeSplitter.height / 2;
    this.addChild(this.lobbyWinAmountAndEntryFeeSplitter);

    this.lobbyWinAmountView = new LobbyWinAmountView(
      "",
      this.lobbyWinAmountAndEntryFeeSplitter.width,
    );
    this.addChild(this.lobbyWinAmountView);

    // Attach plus/minus button handlers
    this.lobbyWinAmountView.plusEntryFeeButton.onPress.connect(() => {
      this.handlePlusButtonPress();
    });
    this.lobbyWinAmountView.minusEntryFeeButton.onPress.connect(() => {
      this.handleMinusButtonPress();
    });

    this.entryFeeContainer = new Container();
    this.addChild(this.entryFeeContainer);

    this.entryFee = new Text({
      text: "Entry Fee:",
      style: {
        fontFamily: "Inter",
        fontSize: 19,
        fill: 0xffffff,
        align: "left",
        fontWeight: "400",
      },
    });
    this.entryFeeContainer.addChild(this.entryFee);

    this.entryFeeAmountContainer = new Container();
    this.entryFeeContainer.addChild(this.entryFeeAmountContainer);

    this.entryFeeInDollar = new Text({
      text: "",
      style: {
        fontFamily: "Inter",
        fontSize: 19,
        fill: 0xffffff,
        align: "left",
        fontWeight: "400",
      },
    });
    this.entryFeeAmountContainer.addChild(this.entryFeeInDollar);

    this.entryFeeCurrencySymbol = new Container();
    this.entryFeeAmountContainer.addChild(this.entryFeeCurrencySymbol);

    this.entryFeeCurrencyGroup = new Container();
    this.entryFeeCurrencySymbol.addChild(this.entryFeeCurrencyGroup);

    this.entryFeeAndRankGroupSplitter = Sprite.from("splitter");
    this.entryFeeAndRankGroupSplitter.width =
      this.entryFeeAndRankGroupSplitter.width / 2;
    this.entryFeeAndRankGroupSplitter.height =
      this.entryFeeAndRankGroupSplitter.height / 2;
    this.addChild(this.entryFeeAndRankGroupSplitter);

    this.rankGroup = new RankGroup(
      [],
      this.entryFeeAndRankGroupSplitter.width,
      8,
    );
    this.addChild(this.rankGroup);

    this.scrollBoxContainer = new Container();
    this.addChild(this.scrollBoxContainer);

    // Create no lobbies message
    this.noLobbiesMessage = new Text({
      text: "No Lobbies Available",
      style: {
        fontFamily: "Inter",
        fontSize: 18,
        fill: 0xffffff,
        align: "center",
        fontWeight: "400",
      },
    });
    this.noLobbiesMessage.anchor.set(0.5);
    this.noLobbiesMessage.visible = false;
    this.addChild(this.noLobbiesMessage);

    this.setLayout();
    this.filterLobbiesByCurrency();
    // updateDisplay is called in filterLobbiesByCurrency, so no need to call here
  }

  private setLayout(animate: boolean = false) {
    // Position inactive lobby format
    this.background.y =
      this.lobbyFormatsWrapper.y + this.lobbyFormatsWrapper.height - 8;

    // Determine spacing based on whether rankGroup is visible
    // Check if rankGroup should be visible (only for non-DUEL formats)
    const hasRankRewards =
      this.selectedLobby?.rankRewards &&
      this.selectedLobby.rankRewards.length > 0;
    const isDuelFormat = this.activeLobbyFormat === LOBBY_FORMAT.DUEL;
    const shouldShowRankGroup = hasRankRewards && !isDuelFormat;
    const spacing = shouldShowRankGroup
      ? this.SPACING_WITH_RANK_GROUP
      : this.SPACING_WITHOUT_RANK_GROUP;

    // Position title
    const titleX = this.background.width / 2 - this.title.width / 2;
    const titleY = shouldShowRankGroup
      ? this.background.y + 10
      : this.background.y + 10 + 20;

    // Position win amount view
    const winAmountViewX =
      this.background.width / 2 - this.lobbyWinAmountView.width / 2;
    const winAmountViewY =
      titleY + this.title.height + 10 + (shouldShowRankGroup ? 0 : 20);

    const splitterX = this.lobbyWinAmountView.x;
    const splitterY = winAmountViewY + this.lobbyWinAmountView.height + 5;

    // Position entry fee
    const entryFeeX = this.lobbyWinAmountView.x;
    const entryFeeY =
      splitterY + this.lobbyWinAmountAndEntryFeeSplitter.height + spacing;

    // Position entry fee and rank group splitter (only if rankGroup is visible)
    let splitterYPos = 0;
    let rankGroupY = 0;

    if (shouldShowRankGroup) {
      splitterYPos = entryFeeY + this.entryFeeContainer.height + spacing;
      rankGroupY =
        splitterYPos + this.entryFeeAndRankGroupSplitter.height + spacing;
    }

    // Animate or set positions directly
    if (animate) {
      // Animate all components to new positions
      gsap.to(this.title, {
        x: titleX,
        y: titleY,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(this.lobbyWinAmountView, {
        x: winAmountViewX,
        y: winAmountViewY,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(this.lobbyWinAmountAndEntryFeeSplitter, {
        x: splitterX,
        y: splitterY,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(this.entryFeeContainer, {
        x: entryFeeX,
        y: entryFeeY,
        duration: 0.4,
        ease: "power2.out",
      });

      if (shouldShowRankGroup) {
        gsap.to(this.entryFeeAndRankGroupSplitter, {
          x: entryFeeX,
          y: splitterYPos,
          duration: 0.4,
          ease: "power2.out",
        });
      }
    } else {
      // Set positions directly
      this.title.x = titleX;
      this.title.y = titleY;

      this.lobbyWinAmountView.x = winAmountViewX;
      this.lobbyWinAmountView.y = winAmountViewY;

      this.lobbyWinAmountAndEntryFeeSplitter.x = splitterX;
      this.lobbyWinAmountAndEntryFeeSplitter.y = splitterY;

      this.entryFeeContainer.x = entryFeeX;
      this.entryFeeContainer.y = entryFeeY;

      if (shouldShowRankGroup) {
        this.entryFeeAndRankGroupSplitter.x = entryFeeX;
        this.entryFeeAndRankGroupSplitter.y = splitterYPos;
      }
    }

    // Handle entry fee amount container position (always relative to entryFeeContainer)
    this.entryFeeAmountContainer.x =
      this.lobbyWinAmountAndEntryFeeSplitter.width -
      this.entryFeeAmountContainer.width;
    this.entryFeeAmountContainer.y = 0;

    // Handle rankGroup visibility and position
    if (shouldShowRankGroup) {
      this.entryFeeAndRankGroupSplitter.visible = true;
      this.rankGroup.x = entryFeeX;
      if (!animate) {
        this.rankGroup.y = rankGroupY;
      }
    } else {
      this.entryFeeAndRankGroupSplitter.visible = false;
      this.rankGroup.visible = false;
    }
  }

  /**
   * Initialize lobby format containers dynamically based on available lobbies
   */
  private initializeLobbyFormats() {
    // Get unique lobby formats from lobbies
    const formatMap = new Map<number, LOBBY_FORMAT>();

    this.lobbies.forEach((lobby) => {
      if (!formatMap.has(lobby.numPlayers)) {
        formatMap.set(lobby.numPlayers, lobby.lobbyFormat);
      }
    });

    // Sort by number of players
    const sortedFormats = Array.from(formatMap.entries()).sort(
      (a, b) => a[0] - b[0],
    );

    // Check if we only have 2 player lobbies
    const hasOnly2Players =
      sortedFormats.length === 1 && sortedFormats[0][0] === 2;

    // Generate lobby format configs
    const configs: LobbyFormatConfig[] = sortedFormats.map(
      ([numPlayers, lobbyFormat]) => ({
        text: `${numPlayers} Players`,
        isActive: lobbyFormat === LOBBY_FORMAT.TOURNAMENT,
      }),
    );

    // If we only have 2 player lobbies, add a disabled "10 Players (Coming Soon)" tab
    if (hasOnly2Players) {
      configs.push({
        text: "10 Players",
        isActive: false,
        isComingSoon: true,
      });
    }

    // Priority 1: Check for query parameter lobby format
    const queryLobbyFormat = localStorageUtil.getItem(
      LOCAL_STORAGE_KEYS.QUERY_LOBBY_FORMAT,
    );

    let formatToActivate: LOBBY_FORMAT | undefined;

    if (queryLobbyFormat) {
      // Check if query format exists in available formats
      const queryFormatExists = sortedFormats.find(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, format]) => format === queryLobbyFormat,
      );
      if (queryFormatExists) {
        formatToActivate = queryLobbyFormat as LOBBY_FORMAT;
        // Clear the query param after using it (one-time use)
        localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.QUERY_LOBBY_FORMAT);
      }
    }

    // Priority 2: Try to restore last selected format from localStorage
    if (!formatToActivate) {
      const savedFormat = localStorageUtil.getItem(
        LOCAL_STORAGE_KEYS.LAST_LOBBY_FORMAT,
      );

      if (savedFormat) {
        // Check if saved format exists in available formats
        const savedFormatExists = sortedFormats.find(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ([_, format]) => format === savedFormat,
        );
        if (savedFormatExists) {
          formatToActivate = savedFormat as LOBBY_FORMAT;
        }
      }
    }

    // Priority 3: Fallback logic if no saved format or saved format doesn't exist
    if (!formatToActivate) {
      // Set initial active format to DUEL (2 players) if available
      const duelFormat = sortedFormats.find(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, format]) => format === LOBBY_FORMAT.DUEL,
      );
      if (duelFormat) {
        formatToActivate = LOBBY_FORMAT.DUEL;
      } else if (sortedFormats.length > 0) {
        // Fallback to first available format
        formatToActivate = sortedFormats[0][1];
      }
    }

    this.activeLobbyFormat = formatToActivate;

    // Add lobby format containers if we have any
    if (configs.length > 0) {
      this.addLobbyFormatContainers(configs);
    }
  }

  /**
   * Add multiple lobby format containers dynamically
   * @param configs Array of lobby format configurations
   * @param options Layout options for arranging containers
   */
  public addLobbyFormatContainers(
    configs: LobbyFormatConfig[],
    options?: {
      startX?: number;
      startY?: number;
      spacing?: number;
      layout?: "horizontal" | "vertical";
    },
  ) {
    const {
      startX = 20,
      startY = 0,
      spacing = -7,
      layout = "horizontal",
    } = options || {};

    // Clear existing containers if any
    this.clearLobbyFormatContainers();

    configs.forEach((config, index) => {
      // Determine if this container should be active based on current format
      const formatText = config.text;
      const numPlayers = parseInt(formatText.split(" ")[0], 10);
      const lobbyWithFormat = this.lobbies.find(
        (lobby) => lobby.numPlayers === numPlayers,
      );
      const isActiveFormat =
        lobbyWithFormat?.lobbyFormat === this.activeLobbyFormat;

      // Check if we should show the "new" tag for tournament (10 players)
      // Don't show new tag if it's a coming soon tab
      const shouldShowNewTag =
        numPlayers === 10 &&
        !config.isComingSoon &&
        this.shouldShowTournamentNewTag();

      const container = new LobbyFormatContainer({
        ...config,
        isActive: config.isComingSoon ? false : isActiveFormat,
        isNew: shouldShowNewTag,
        isComingSoon: config.isComingSoon,
      });

      // Calculate position based on layout
      if (layout === "horizontal") {
        const xOffset =
          index > 0
            ? this.lobbyFormatContainers.reduce(
                (sum, c) => sum + c.width + spacing,
                0,
              )
            : 0;
        container.x = startX + xOffset;
        container.y = startY;
      } else {
        // vertical layout
        const yOffset =
          index > 0
            ? this.lobbyFormatContainers.reduce(
                (sum, c) => sum + c.height + spacing,
                0,
              )
            : 0;
        container.x = startX;
        container.y = startY + yOffset;
      }

      // Add click handler only if not coming soon
      if (!container.isComingSoon) {
        container.on("pointerdown", () => {
          this.onLobbyFormatSelected(container, index);
          sfx.play("common/sfx-press.wav");
        });
      }

      this.lobbyFormatContainers.push(container);
      this.lobbyFormatsWrapper.addChild(container);
    });

    return this.lobbyFormatContainers;
  }

  /**
   * Add a single lobby format container
   * @param config Lobby format configuration
   */
  public addLobbyFormatContainer(config: LobbyFormatConfig) {
    const container = new LobbyFormatContainer(config);
    this.lobbyFormatContainers.push(container);
    this.lobbyFormatsWrapper.addChild(container);
    return container;
  }

  /**
   * Remove all lobby format containers
   */
  public clearLobbyFormatContainers() {
    this.lobbyFormatContainers.forEach((container) => {
      container.destroy();
    });
    this.lobbyFormatContainers = [];
    this.lobbyFormatsWrapper.removeChildren();
  }

  /**
   * Handle lobby format selection
   * @param selectedContainer The selected container
   * @param index Index of the selected container
   */
  private onLobbyFormatSelected(
    selectedContainer: LobbyFormatContainer,
    index: number,
  ) {
    // Deactivate all containers
    this.lobbyFormatContainers.forEach((container) => {
      container.setActive(false);
    });

    // Activate the selected container
    selectedContainer.setActive(true);

    // Map format text to LOBBY_FORMAT
    const formatText = selectedContainer.formatText.text;
    const previousFormat = this.activeLobbyFormat;
    const isSwitchingToTournament = formatText === "10 Players";
    const isSwitchingToDuel = formatText === "2 Players";

    if (isSwitchingToTournament) {
      this.activeLobbyFormat = LOBBY_FORMAT.TOURNAMENT;
    } else if (isSwitchingToDuel) {
      this.activeLobbyFormat = LOBBY_FORMAT.DUEL;
    }

    // Save the selected format to localStorage
    if (this.activeLobbyFormat) {
      localStorageUtil.setItem(
        LOCAL_STORAGE_KEYS.LAST_LOBBY_FORMAT,
        this.activeLobbyFormat,
      );
    }

    // Emit custom event for lobby format selection
    this.emit("lobby-format-selected", {
      container: selectedContainer,
      index,
      formatText: selectedContainer.formatText.text,
    });

    // Refilter lobbies with new format
    this.filterLobbiesByCurrency();

    // Animate rankGroup based on format switch
    if (previousFormat !== this.activeLobbyFormat) {
      this.animateRankGroupOnFormatSwitch(
        isSwitchingToTournament,
        isSwitchingToDuel,
      );
    }
  }

  /**
   * Get the currently active lobby format container
   */
  public getActiveLobbyFormat(): LobbyFormatContainer | undefined {
    return this.lobbyFormatContainers.find((container) => container.isActive);
  }

  /**
   * Set active lobby format by index
   * @param index Index of the container to activate
   */
  public setActiveLobbyFormatByIndex(index: number) {
    if (index < 0 || index >= this.lobbyFormatContainers.length) {
      console.warn(`Invalid index: ${index}`);
      return;
    }

    this.lobbyFormatContainers.forEach((container, i) => {
      container.setActive(i === index);
    });

    // Map format index to LOBBY_FORMAT dynamically
    const formatText = this.lobbyFormatContainers[index]?.formatText.text;
    const previousFormat = this.activeLobbyFormat;

    // Extract number of players from format text (e.g., "10 Players" -> 10)
    const numPlayers = parseInt(formatText.split(" ")[0], 10);

    // Find the lobby format for this number of players
    const lobbyWithFormat = this.lobbies.find(
      (lobby) => lobby.numPlayers === numPlayers,
    );
    const newFormat = lobbyWithFormat?.lobbyFormat;

    if (newFormat) {
      this.activeLobbyFormat = newFormat;
    }

    const isSwitchingToTournament =
      this.activeLobbyFormat === LOBBY_FORMAT.TOURNAMENT;
    const isSwitchingToDuel = this.activeLobbyFormat === LOBBY_FORMAT.DUEL;

    this.filterLobbiesByCurrency();

    // Animate rankGroup based on format switch
    if (previousFormat !== this.activeLobbyFormat) {
      this.animateRankGroupOnFormatSwitch(
        isSwitchingToTournament,
        isSwitchingToDuel,
      );
    }
  }

  /**
   * Filter lobbies by active currency and lobby format
   */
  private filterLobbiesByCurrency() {
    this.filteredLobbies = this.lobbies
      .filter((lobby) => {
        const currencyMatch = lobby.currencyCode === this.activeCurrency;
        const formatMatch = this.activeLobbyFormat
          ? lobby.lobbyFormat === this.activeLobbyFormat
          : true;
        return currencyMatch && formatMatch;
      })
      .sort((a, b) => a.entryFee - b.entryFee);

    if (this.filteredLobbies.length > 0) {
      // Hide no lobbies message
      this.showNoLobbiesMessage(false);

      // Find current lobby index in filtered list
      const previousSelectedId = this.selectedLobby?._id;
      if (this.selectedLobby) {
        // Check if selected lobby matches the active format
        const lobbyMatchesFormat =
          this.selectedLobby.lobbyFormat === this.activeLobbyFormat;
        const index = this.filteredLobbies.findIndex(
          (l) => l._id === this.selectedLobby?._id,
        );
        if (index >= 0 && lobbyMatchesFormat) {
          this.currentLobbyIndex = index;
        } else {
          // Selected lobby not in filtered list, try to restore from localStorage
          this.restoreSavedLobby();
        }
      } else {
        // No lobby selected, try to restore from localStorage
        this.restoreSavedLobby();
      }

      // Only update display if lobby changed
      if (previousSelectedId !== this.selectedLobby?._id) {
        this.updateDisplay(this.selectedLobby);
        this.emit("lobby-selected", this.selectedLobby);
      } else {
        // Still update display to refresh rankGroup visibility
        this.updateDisplay(this.selectedLobby);
      }
    } else {
      // No lobbies match the filter
      this.selectedLobby = undefined;
      this.currentLobbyIndex = 0;
      this.showNoLobbiesMessage(true);
      // Hide all lobby-related UI elements
      this.hideLobbyUI();
    }
  }

  /**
   * Get localStorage key for lobby ID based on format
   */
  private getLobbyIdKey(): LOCAL_STORAGE_KEYS {
    return this.activeLobbyFormat === LOBBY_FORMAT.DUEL
      ? LOCAL_STORAGE_KEYS.LAST_LOBBY_ID_DUEL
      : LOCAL_STORAGE_KEYS.LAST_LOBBY_ID_TOURNAMENT;
  }

  /**
   * Check if we should show the "new" tag for tournament format
   * Returns false if user has played 3 or more tournament games
   */
  private shouldShowTournamentNewTag(): boolean {
    const gamesPlayed = parseInt(
      localStorageUtil.getItem(LOCAL_STORAGE_KEYS.TOURNAMENT_GAMES_PLAYED) ||
        "0",
      10,
    );
    return gamesPlayed < 3;
  }

  /**
   * Restore saved lobby preference from localStorage
   */
  private restoreSavedLobby() {
    // Try to restore by lobby ID first (format-specific)
    const savedLobbyId = localStorageUtil.getItem(this.getLobbyIdKey());

    if (savedLobbyId) {
      const lobbyById = this.filteredLobbies.find(
        (l) => l._id === savedLobbyId,
      );
      if (lobbyById) {
        // Verify the lobby matches the active format
        if (lobbyById.lobbyFormat === this.activeLobbyFormat) {
          this.selectedLobby = lobbyById;
          this.currentLobbyIndex = this.filteredLobbies.indexOf(lobbyById);
          // Save the preference again to update timestamp
          this.saveLobbyPreference(lobbyById);
          return;
        }
        // If format doesn't match, clear the saved lobby ID to prevent future conflicts
        localStorageUtil.removeItem(this.getLobbyIdKey());
      }
    }

    // Fallback to first available lobby in the active format
    this.currentLobbyIndex = 0;
    this.selectedLobby = this.filteredLobbies[0];
    // Save the default selection
    if (this.selectedLobby) {
      this.saveLobbyPreference(this.selectedLobby);
    }
  }

  /**
   * Show or hide no lobbies message
   */
  private showNoLobbiesMessage(show: boolean) {
    if (show) {
      this.noLobbiesMessage.visible = true;
      // Position message in center of the background
      this.noLobbiesMessage.x = this.background.width / 2;
      this.noLobbiesMessage.y = this.background.y + this.background.height / 2;
    } else {
      this.noLobbiesMessage.visible = false;
    }
  }

  /**
   * Hide lobby UI elements when no lobbies are available
   */
  private hideLobbyUI() {
    this.lobbyWinAmountView.visible = false;
    this.lobbyWinAmountAndEntryFeeSplitter.visible = false;
    this.entryFeeContainer.visible = false;
    this.entryFeeAndRankGroupSplitter.visible = false;
    this.rankGroup.visible = false;
    this.title.visible = false;
  }

  /**
   * Show lobby UI elements when lobbies are available
   */
  private showLobbyUI() {
    this.lobbyWinAmountView.visible = true;
    this.lobbyWinAmountAndEntryFeeSplitter.visible = true;
    this.entryFeeContainer.visible = true;
    this.title.visible = true;
    // rankGroup and splitter visibility handled by updateDisplay
    this.updateButtonStates();
  }

  /**
   * Update plus/minus button states based on available lobbies
   */
  private updateButtonStates() {
    const hasLobbies = this.filteredLobbies.length > 0;
    const canGoUp =
      hasLobbies && this.currentLobbyIndex < this.filteredLobbies.length - 1;
    const canGoDown = hasLobbies && this.currentLobbyIndex > 0;

    // Enable/disable buttons based on availability
    this.lobbyWinAmountView.plusEntryFeeButton.interactive = canGoUp;
    this.lobbyWinAmountView.minusEntryFeeButton.interactive = canGoDown;

    // Visual feedback - adjust alpha
    this.lobbyWinAmountView.plusEntryFeeButton.alpha = canGoUp ? 1 : 0.5;
    this.lobbyWinAmountView.minusEntryFeeButton.alpha = canGoDown ? 1 : 0.5;
  }

  /**
   * Handle plus button press - navigate to next higher entry fee lobby
   */
  private handlePlusButtonPress() {
    if (this.filteredLobbies.length === 0 || !this.selectedLobby) return;

    const nextIndex = Math.min(
      this.currentLobbyIndex + 1,
      this.filteredLobbies.length - 1,
    );

    if (nextIndex !== this.currentLobbyIndex) {
      this.currentLobbyIndex = nextIndex;
      this.selectedLobby = this.filteredLobbies[nextIndex];
      this.saveLobbyPreference(this.selectedLobby);
      this.updateDisplay(this.selectedLobby);
      this.updateButtonStates();
      this.emit("lobby-selected", this.selectedLobby);
    }
  }

  /**
   * Handle minus button press - navigate to next lower entry fee lobby
   */
  private handleMinusButtonPress() {
    if (this.filteredLobbies.length === 0 || !this.selectedLobby) return;

    const prevIndex = Math.max(this.currentLobbyIndex - 1, 0);

    if (prevIndex !== this.currentLobbyIndex) {
      this.currentLobbyIndex = prevIndex;
      this.selectedLobby = this.filteredLobbies[prevIndex];
      this.saveLobbyPreference(this.selectedLobby);
      this.updateDisplay(this.selectedLobby);
      this.updateButtonStates();
      this.emit("lobby-selected", this.selectedLobby);
    }
  }

  /**
   * Save lobby preference to localStorage (format-specific)
   */
  private saveLobbyPreference(lobby: Lobby) {
    if (lobby) {
      localStorageUtil.setItem(this.getLobbyIdKey(), lobby._id);
    }
  }

  /**
   * Update display with selected lobby data
   */
  private updateDisplay(lobby: Lobby | undefined) {
    if (!lobby) {
      this.hideLobbyUI();
      return;
    }

    // Show lobby UI elements
    this.showLobbyUI();

    // Get currency symbol from mapping
    const currencyMapping = CURRENCY_UI_MAPPING[lobby.currencyCode];
    const currencySymbol = currencyMapping?.symbol || "";
    const currencyIcon = currencyMapping?.icon;

    // Update win amount with currency display
    const winAmountText = formatCurrency(
      lobby?.winAmount ?? 0,
      lobby.currencyCode,
      currencySymbol,
      !currencyIcon, // Include symbol in text only if there's no icon
    );
    this.lobbyWinAmountView.updateAmount(winAmountText);
    // Only use CurrencyDisplay for icons, not text symbols
    this.lobbyWinAmountView.updateCurrency(currencyIcon, undefined);

    // Update entry fee with currency display
    const entryFeeText = formatCurrency(
      lobby.entryFee,
      lobby.currencyCode,
      currencySymbol,
      !currencyIcon, // Include symbol in text only if there's no icon
    );
    this.entryFeeInDollar.text = entryFeeText;

    // Update or create entry fee currency display (only for icons, not text symbols)
    if (currencyIcon) {
      if (!this.entryFeeCurrencyDisplay) {
        this.entryFeeCurrencyDisplay = new CurrencyDisplay({
          icon: currencyIcon,
          size: 20,
        });
        this.entryFeeAmountContainer.addChildAt(
          this.entryFeeCurrencyDisplay,
          0,
        );
      } else {
        this.entryFeeCurrencyDisplay.updateCurrency({
          icon: currencyIcon,
        });
      }

      // Reposition entry fee text with icon spacing
      const iconSpacing = 6;
      this.entryFeeCurrencyDisplay.x = 0;
      this.entryFeeCurrencyDisplay.y =
        (this.entryFeeInDollar.height -
          this.entryFeeCurrencyDisplay.getDisplayHeight()) /
        2;
      this.entryFeeInDollar.x =
        this.entryFeeCurrencyDisplay.getDisplayWidth() + iconSpacing;
    } else if (this.entryFeeCurrencyDisplay) {
      this.entryFeeCurrencyDisplay.visible = false;
      this.entryFeeInDollar.x = 0;
    }

    // Update rank group with actual rank rewards if available (only for non-DUEL formats)
    const isDuelFormat = this.activeLobbyFormat === LOBBY_FORMAT.DUEL;
    const hasRankRewards = lobby.rankRewards && lobby.rankRewards.length > 0;
    const shouldShowRankGroup = hasRankRewards && !isDuelFormat;

    if (shouldShowRankGroup && lobby.rankRewards) {
      const rankInfos = lobby.rankRewards.map((reward) => {
        const rewardCurrencyMapping =
          CURRENCY_UI_MAPPING[reward.currencyCode || lobby.currencyCode];
        const rewardSymbol = rewardCurrencyMapping?.symbol || "";
        const rewardIcon = rewardCurrencyMapping?.icon;
        const rewardText = formatCurrency(
          reward.rewardAmount,
          reward.currencyCode ||
            lobby.winAmountCurrencyCode ||
            lobby.currencyCode,
          rewardSymbol,
          !rewardIcon, // Include symbol in text only if there's no icon
        );
        return {
          place: `${reward.rank}${this.getOrdinalSuffix(reward.rank)} Place`,
          amount: rewardText,
          currencyIcon: rewardIcon,
          currencySymbol: undefined, // Only use icons, not text symbols
        };
      });
      // Add empty item at the end to make it easily scrollable
      rankInfos.push({
        place: "",
        amount: "",
        currencyIcon: undefined,
        currencySymbol: undefined,
      });
      this.rankGroup.setRankInfos(rankInfos);
      // Set visible if not already animating
      if (this.rankGroup.alpha === 1 || this.rankGroup.alpha === 0) {
        this.rankGroup.visible = true;
        this.rankGroup.alpha = 1;
        this.entryFeeAndRankGroupSplitter.visible = true;
        this.entryFeeAndRankGroupSplitter.alpha = 1;
      }
    } else {
      // Hide rank group if no rank rewards or DUEL format (unless animation is handling it)
      if (this.rankGroup.alpha === 1 || this.rankGroup.alpha === 0) {
        this.rankGroup.visible = false;
        this.entryFeeAndRankGroupSplitter.visible = false;
      }
    }

    // Update layout to adjust spacing based on rankGroup visibility
    this.setLayout();
  }

  /**
   * Animate rankGroup when switching between formats
   */
  private animateRankGroupOnFormatSwitch(
    isSwitchingToTournament: boolean,
    isSwitchingToDuel: boolean,
  ) {
    const hasRankRewards =
      this.selectedLobby?.rankRewards &&
      this.selectedLobby.rankRewards.length > 0;
    // Only show rank group for non-DUEL formats
    const shouldShowRankGroup = hasRankRewards && !isSwitchingToDuel;

    // Animate all components to new positions with adjusted spacing
    // This will handle the spacing change between components
    this.setLayout(true);

    if (isSwitchingToTournament && shouldShowRankGroup) {
      // Show rankGroup with animation from bottom
      this.rankGroup.visible = true;
      this.entryFeeAndRankGroupSplitter.visible = true;

      // Calculate target position using the spacing with rank group
      const spacing = this.SPACING_WITH_RANK_GROUP;
      const entryFeeY = this.entryFeeContainer.y;
      const splitterYPos = entryFeeY + this.entryFeeContainer.height + spacing;
      const targetY =
        splitterYPos + this.entryFeeAndRankGroupSplitter.height + spacing;

      // Set initial state for animation (start 50px below target)
      this.rankGroup.y = targetY + 50;
      this.rankGroup.alpha = 0;
      this.entryFeeAndRankGroupSplitter.alpha = 0;

      // Animate from bottom with ease
      gsap.to(this.rankGroup, {
        y: targetY,
        alpha: 1,
        duration: 0.4,
        ease: "power2.out",
      });

      // Animate splitter
      gsap.to(this.entryFeeAndRankGroupSplitter, {
        alpha: 1,
        duration: 0.4,
        ease: "power2.out",
      });
    } else if (isSwitchingToDuel || !shouldShowRankGroup) {
      // Hide rankGroup with animation
      if (this.rankGroup.visible && this.rankGroup.alpha > 0) {
        const currentY = this.rankGroup.y;
        gsap.to(this.rankGroup, {
          y: currentY + 50,
          alpha: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            this.rankGroup.visible = false;
          },
        });

        gsap.to(this.entryFeeAndRankGroupSplitter, {
          alpha: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            this.entryFeeAndRankGroupSplitter.visible = false;
          },
        });
      } else {
        // Already hidden, just ensure visibility is false
        this.rankGroup.visible = false;
        this.entryFeeAndRankGroupSplitter.visible = false;
      }
    }
  }

  /**
   * Get ordinal suffix for rank numbers (1st, 2nd, 3rd, etc.)
   */
  private getOrdinalSuffix(rank: number): string {
    const j = rank % 10;
    const k = rank % 100;
    if (j === 1 && k !== 11) return "ST";
    if (j === 2 && k !== 12) return "ND";
    if (j === 3 && k !== 13) return "RD";
    return "TH";
  }

  /**
   * Set lobbies and update display
   */
  public setLobbies(lobbies: Lobby[]) {
    this.lobbies = lobbies;
    // Reinitialize lobby formats when lobbies change
    this.initializeLobbyFormats();
    this.filterLobbiesByCurrency();
  }

  /**
   * Set active currency and filter lobbies
   */
  public setActiveCurrency(currency: CURRENCY_CODES) {
    this.activeCurrency = currency;
    this.filterLobbiesByCurrency();
    if (this.filteredLobbies.length > 0) {
      this.emit("lobby-selected", this.selectedLobby);
    }
  }

  /**
   * Set selected lobby and update display
   */
  public setSelectedLobby(lobby: Lobby | undefined) {
    this.selectedLobby = lobby;
    if (lobby) {
      const index = this.filteredLobbies.findIndex((l) => l._id === lobby._id);
      if (index >= 0) {
        this.currentLobbyIndex = index;
      }
      this.saveLobbyPreference(lobby);
      this.updateDisplay(lobby);
    }
  }

  /**
   * Get currently selected lobby
   */
  public getSelectedLobby(): Lobby | undefined {
    return this.selectedLobby;
  }

  /**
   * Get active lobby format
   */
  public getActiveLobbyFormatType(): LOBBY_FORMAT | undefined {
    return this.activeLobbyFormat;
  }
}
