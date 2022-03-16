import { AbleAction } from "../../actions/action";
import { ActionDef } from "../../types/Action";
import { GenericAction } from "../../actions/action";
export type ParticularAction = AbleAction;
export type Action = GenericAction | ParticularAction;