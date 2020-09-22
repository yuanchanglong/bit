import R from 'ramda';
import { ExtensionDataList, ExtensionDataEntry } from 'bit-bin/dist/consumer/config/extension-data';
import { ComponentID } from './id';
import { AspectEntry, SerializableMap } from './aspect-entry';

/**
 * list of aspects, each may have data and artifacts saved per component.
 */
export class AspectList {
  constructor(readonly entries: AspectEntry[]) {}

  addEntry(aspectId: ComponentID, data: SerializableMap = {}) {
    const extensionDataEntry = new ExtensionDataEntry(undefined, aspectId._legacy, undefined, {}, data, []);
    const entry = new AspectEntry(aspectId, extensionDataEntry);
    this.entries.push(entry);
    return entry;
  }

  /**
   * get all ids as strings from the aspect list.
   */
  get ids(): string[] {
    const list = this.entries.map((entry) => entry.id.toString());
    return list;
  }

  /**
   * get an aspect from the list using a serialized ID.
   */
  get(id: string): AspectEntry | undefined {
    return this.entries.find((entry) => {
      return entry.legacy.stringId === id;
    });
  }

  /**
   * find aspect by component ID.
   */
  find(id: ComponentID, ignoreVersion = false): AspectEntry | undefined {
    return this.entries.find((aspectEntry) => {
      return id.isEqual(aspectEntry.id, { ignoreVersion });
    });
  }

  /**
   * transform an aspect list into a new one.
   */
  map(predicate: (entry: AspectEntry) => AspectEntry) {
    const entries = this.entries.map(predicate);
    return new AspectList(entries);
  }

  toConfigObject() {
    const res = {};
    this.entries.forEach((entry) => {
      if (entry.config && !R.isEmpty(entry.config)) {
        res[entry.id.toString()] = entry.config;
      }
    });
    return res;
  }

  toLegacy(): ExtensionDataList {
    const legacyEntries = this.entries.map((entry) => entry.legacy);
    return ExtensionDataList.fromArray(legacyEntries);
  }

  stringIds(): string[] {
    const ids = this.entries.map((entry) => entry.id.toString());
    return ids;
  }

  static fromLegacyExtensions(legacyDataList: ExtensionDataList): AspectList {
    const newEntries = legacyDataList.map((entry) => {
      return new AspectEntry(getAspectId(entry), entry);
    });

    return new AspectList(newEntries);
  }
}

function getAspectId(entry: ExtensionDataEntry) {
  if (!entry.extensionId && entry.name) return ComponentID.fromString(entry.name);
  if (entry.extensionId) return ComponentID.fromLegacy(entry.extensionId);
  throw new Error('aspect cannot be loaded without setting an ID');
}