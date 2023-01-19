import { EntityDef as Modi } from "./Modi/Schema";
import { EntityDef as ModiEntity } from "./ModiEntity/Schema";
import { EntityDef as Oper } from "./Oper/Schema";
import { EntityDef as OperEntity } from "./OperEntity/Schema";
import { EntityDef as User } from "./User/Schema";
export type EntityDict = {
    modi: Modi;
    modiEntity: ModiEntity;
    oper: Oper;
    operEntity: OperEntity;
    user: User;
};
