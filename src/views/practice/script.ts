import { init } from "../../main";
import { startPractice } from "./practiceInitializer";

init().then(startPractice).catch(console.error);
