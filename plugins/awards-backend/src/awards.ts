import { Award, AwardInput } from "@seatgeek/backstage-plugin-awards-common";
import { AwardsStore } from "./database/awards";
import { NotFoundError } from "@backstage/errors";
import { Logger } from "winston";

export class Awards {
  private readonly db: AwardsStore;
  private readonly logger: Logger;

  constructor(db: AwardsStore, logger: Logger) {
    this.db = db;
    this.logger = logger.child({ class: 'Awards' });
    this.logger.debug('Constructed');
  }

  async get(uid: string): Promise<Award> {
    return await this.getAwardByUid(uid);
  }

  async update(identityRef: string, uid: string, input: AwardInput): Promise<Award> {
    const award = await this.getAwardByUid(uid);

    if (!award.owners.includes(identityRef)) {
      throw new Error('Unauthorized to update award');
    }

    const updated = await this.db.update(
      uid,
      input.name,
      input.description,
      input.image,
      input.owners,
      input.recipients,
    );

    return updated;
  }

  async delete(identityRef: string, uid: string): Promise<boolean> {
    const award = await this.getAwardByUid(uid);

    if (!award.owners.includes(identityRef)) {
      throw new Error('Unauthorized to delete award');
    }

    return await this.db.delete(uid);
  }

  private async getAwardByUid(uid: string): Promise<Award> {
    const res = await this.db.search(uid, '', [], []);

    if (!res || res.length === 0) {
      throw new NotFoundError(uid);
    }

    return res[0];
  }
}
