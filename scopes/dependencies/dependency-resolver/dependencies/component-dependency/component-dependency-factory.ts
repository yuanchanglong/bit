import { ComponentMain } from '@teambit/component';
import { compact } from 'ramda-adjunct';
import { Dependency as LegacyDependency } from 'bit-bin/dist/consumer/component/dependencies';
import LegacyComponent from 'bit-bin/dist/consumer/component';
import { ExtensionDataEntry } from 'bit-bin/dist/consumer/config';
import componentIdToPackageName from 'bit-bin/dist/utils/bit/component-id-to-package-name';
import { ComponentDependency, SerializedComponentDependency, TYPE } from './component-dependency';
import { DependencyLifecycleType } from '../dependency';
import { DependencyFactory } from '../dependency-factory';
import { DependencyList } from '../dependency-list';

// TODO: think about where is the right place to put this
// export class ComponentDependencyFactory implements DependencyFactory<ComponentDependency, SerializedComponentDependency> {
//   parse(serialized: SerializedComponentDependency) {
//     const id = ComponentID.fromObject(serialized.componentId);
//     return new ComponentDependency(id, serialized.id, serialized.version, serialized.type, serialized.lifecycle as DependencyLifecycleType);
//   }
// }

export class ComponentDependencyFactory implements DependencyFactory {
  type: string;

  constructor(private componentAspect: ComponentMain) {
    this.type = TYPE;
  }

  // TODO: solve this generics issue and remove the ts-ignore
  // @ts-ignore
  async parse<ComponentDependency, S extends SerializedComponentDependency>(
    serialized: S
  ): Promise<ComponentDependency> {
    const id = await this.componentAspect.getHost().resolveComponentId(serialized.id);
    return (new ComponentDependency(
      id,
      serialized.isExtension,
      serialized.packageName,
      serialized.id,
      serialized.version,
      serialized.lifecycle as DependencyLifecycleType
    ) as unknown) as ComponentDependency;
  }

  async fromLegacyComponent(legacyComponent: LegacyComponent): Promise<DependencyList> {
    const runtimeDepsP = legacyComponent.dependencies
      .get()
      .map((dep) => this.transformLegacyComponentDepToSerializedDependency(dep, 'runtime'));
    const devDepsP = legacyComponent.devDependencies
      .get()
      .map((dep) => this.transformLegacyComponentDepToSerializedDependency(dep, 'dev'));
    const extensionDepsP = legacyComponent.extensions.map((extension) =>
      this.transformLegacyComponentExtensionToSerializedDependency(extension, 'dev')
    );
    const runtimeDeps = await Promise.all(runtimeDepsP);
    const devDeps = await Promise.all(devDepsP);
    const extensionDeps = await Promise.all(extensionDepsP);
    const filteredExtensionDeps: SerializedComponentDependency[] = compact(extensionDeps);
    const serializedComponentDeps = [...runtimeDeps, ...devDeps, ...filteredExtensionDeps];
    const componentDepsP: Promise<ComponentDependency>[] = serializedComponentDeps.map((dep) => this.parse(dep));
    const componentDeps: ComponentDependency[] = await Promise.all(componentDepsP);
    const dependencyList = new DependencyList(componentDeps);
    return dependencyList;
  }

  private async transformLegacyComponentDepToSerializedDependency(
    legacyDep: LegacyDependency,
    lifecycle: DependencyLifecycleType
  ): Promise<SerializedComponentDependency> {
    const host = this.componentAspect.getHost();
    const id = await host.resolveComponentId(legacyDep.id);
    const depComponent = await host.get(id);
    let packageName = '';
    if (depComponent) {
      packageName = componentIdToPackageName(depComponent.state._consumer);
    }
    return {
      id: legacyDep.id.toString(),
      isExtension: false,
      packageName,
      componentId: legacyDep.id.serialize(),
      version: legacyDep.id.getVersion().toString(),
      __type: TYPE,
      lifecycle,
    };
  }

  private async transformLegacyComponentExtensionToSerializedDependency(
    extension: ExtensionDataEntry,
    lifecycle: DependencyLifecycleType
  ): Promise<SerializedComponentDependency | undefined> {
    if (!extension.extensionId) {
      return undefined;
    }
    const host = this.componentAspect.getHost();
    const id = await host.resolveComponentId(extension.extensionId);
    const extComponent = await host.get(id);
    let packageName = '';
    if (extComponent) {
      packageName = componentIdToPackageName(extComponent.state._consumer);
    }
    return {
      id: extension.extensionId.toString(),
      isExtension: true,
      packageName,
      componentId: extension.extensionId.serialize(),
      version: extension.extensionId.getVersion().toString(),
      __type: TYPE,
      lifecycle,
    };
  }
}
