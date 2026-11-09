import { Module } from "@nestjs/common";
import { MasterRecordsController, UnitsController } from "./master-data.controller";
import { MasterRecordService, UnitService } from "./master-data.service";

@Module({
  controllers: [UnitsController, MasterRecordsController],
  providers: [UnitService, MasterRecordService],
})
export class MasterDataModule {}
