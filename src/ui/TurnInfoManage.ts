// import { TurnInfo } from "../network/SocketEventHandler";

// class TurnInfoManage {
//   private static _instance: TurnInfoManage;
//   private earlyTurnInfo: TurnInfo | null = null;

//   private constructor() {}

//   public static getInstance(): TurnInfoManage {
//     if (!TurnInfoManage._instance) {
//       TurnInfoManage._instance = new TurnInfoManage();
//     }
//     return TurnInfoManage._instance;
//   }

//   setTurnInfo(info: TurnInfo) {
//     this.earlyTurnInfo = info;
//   }

//   getTurnInfo(): TurnInfo | null {
//     const info = this.earlyTurnInfo;
//     this.earlyTurnInfo = null;
//     return info ? info : null;
//   }

//   hasTurnInfo(): boolean {
//     return this.earlyTurnInfo !== null;
//   }
// }
// export const turnInfoManage = TurnInfoManage.getInstance();
