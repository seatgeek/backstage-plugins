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

  async update(identityRef: string, uid: string, input: AwardInput): Promise<Award> {
    const res = await this.db.search(uid, '', [], []);

    if (!res || res.length === 0) {
      throw new NotFoundError(uid);
    }

    const award: Award = res[0];

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
}
