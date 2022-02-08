import {
    App, Command, PluginSettingTab, setIcon, Setting,
} from 'obsidian';
import BetterCommandPalettePlugin from 'src/main';
import { HotkeyStyleType, MacroCommandInterface, UnsafeAppInterface } from './types/types';
import { SettingsCommandSuggestModal } from './utils';

export interface BetterCommandPalettePluginSettings {
    closeWithBackspace: boolean,
    fileSearchPrefix: string,
    tagSearchPrefix: string,
    suggestionLimit: number,
    recentAbovePinned: boolean,
    hyperKeyOverride: boolean,
    macros: MacroCommandInterface[],
    hotkeyStyle: HotkeyStyleType;
}

export const DEFAULT_SETTINGS: BetterCommandPalettePluginSettings = {
    closeWithBackspace: true,
    fileSearchPrefix: '/',
    tagSearchPrefix: '#',
    suggestionLimit: 50,
    recentAbovePinned: false,
    hyperKeyOverride: false,
    macros: [],
    hotkeyStyle: 'auto',
};

export class BetterCommandPaletteSettingTab extends PluginSettingTab {
    plugin: BetterCommandPalettePlugin;

    app: UnsafeAppInterface;

    constructor(app: App, plugin: BetterCommandPalettePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.containerEl.empty();
        this.displayBasicSettings();
        this.displayMacroSettings();
    }

    displayBasicSettings(): void {
        const { containerEl } = this;
        const { settings } = this.plugin;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Better Command Palette Settings' });
        new Setting(containerEl)
            .setName('Close on Backspace')
            .setDesc('Close the palette when there is no text and backspace is pressed')
            .addToggle((t) => t.setValue(settings.closeWithBackspace).onChange(async (val) => {
                settings.closeWithBackspace = val;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('Recent above Pinned')
            .setDesc('Sorts the suggestion so that the recently used items show before pinned items.')
            .addToggle((t) => t.setValue(settings.recentAbovePinned).onChange(async (val) => {
                settings.recentAbovePinned = val;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('Caps Lock Hyper Key Hotkey Override')
            .setDesc('For those users who have use a "Hyper Key", enabling this maps the icons "⌥ ^ ⌘ ⇧" to the caps lock icon "⇪" ')
            .addToggle((t) => t.setValue(settings.hyperKeyOverride).onChange(async (val) => {
                settings.hyperKeyOverride = val;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('File Search Prefix')
            .setDesc('The prefix used to tell the palette you want to search files')
            .addText((t) => t.setValue(settings.fileSearchPrefix).onChange(async (val) => {
                settings.fileSearchPrefix = val;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('Tag Search Prefix')
            .setDesc('The prefix used to tell the palette you want to search tags')
            .addText((t) => t.setValue(settings.tagSearchPrefix).onChange(async (val) => {
                settings.tagSearchPrefix = val;
                await this.plugin.saveSettings();
            }));

        const dropdownOptions = {
            10: '10',
            20: '20',
            50: '50',
            100: '100',
            200: '200',
            500: '500',
            1000: '1000',
        };
        new Setting(containerEl)
            .setName('Suggestion Limit')
            .setDesc('The number of items that will be in the suggestion list of the palette. Really high numbers can affect performance')
            .addDropdown((d) => d.addOptions(dropdownOptions)
                .setValue(settings.suggestionLimit.toString())
                .onChange(async (v) => {
                    settings.suggestionLimit = parseInt(v, 10);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Hotkey Modifier Style')
            .setDesc('Allows autodetecting of hotkey modifier or forcing to Mac or Windows')
            .addDropdown((d) => d.addOptions({
                auto: 'Auto Detect',
                mac: 'Force Mac Hotkeys',
                windows: 'Force Windows Hotkeys',
            }).setValue(settings.hotkeyStyle)
                .onChange(async (v) => {
                    settings.hotkeyStyle = v as HotkeyStyleType;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Add new macro')
            .setDesc('Create a new grouping of commands that can be run together')
            .addButton((button) => button
                .setButtonText('+')
                .onClick(async () => {
                    settings.macros.push({
                        name: `Macro ${settings.macros.length + 1}`,
                        commandIds: [],
                        delay: 200,
                    });
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }

    displayMacroSettings(): void {
        const { containerEl } = this;
        const { settings } = this.plugin;

        settings.macros.forEach((macro, index) => {
            const topLevelSetting = new Setting(containerEl)
                .setClass('macro-setting')
                .setName(`Macro #${index + 1}`)
                .addButton((button) => button
                    .setButtonText('Delete Macro')
                    .onClick(async () => {
                        settings.macros.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            const mainSettingsEl = topLevelSetting.settingEl.createEl('div', 'macro-main-settings');

            mainSettingsEl.createEl('label', { text: 'Macro Name' });
            mainSettingsEl.createEl('input', {
                cls: 'name-input',
                type: 'text',
                value: macro.name,
            }).on('change', '.name-input', async (evt: Event) => {
                const target = evt.target as HTMLInputElement;
                settings.macros[index] = { ...macro, name: target.value };
                await this.plugin.saveSettings();
            });

            mainSettingsEl.createEl('label', { text: 'Delay (ms)' });
            mainSettingsEl.createEl('input', {
                cls: 'delay-input',
                type: 'number',
                value: macro.delay.toString(),
            }).on('change', '.delay-input', async (evt: Event) => {
                const target = evt.target as HTMLInputElement;
                const delayStr = target.value;
                settings.macros[index].delay = parseInt(delayStr, 10);
                await this.plugin.saveSettings();
            });

            mainSettingsEl.createEl('label', { text: 'Add a new Command to the macro' });
            mainSettingsEl.createEl('button', { text: 'Add Command' }).onClickEvent(async () => {
                const suggestModal = new SettingsCommandSuggestModal(
                    this.app,
                    async (item: Command) => {
                        settings.macros[index].commandIds.push(item.id);
                        await this.plugin.saveSettings();
                        this.display();
                    },
                );
                suggestModal.open();
            });

            macro.commandIds.forEach((id, cIndex) => {
                const command = this.app.commands.findCommand(id);
                const commandEl = topLevelSetting.settingEl.createEl('div', 'macro-command');

                const buttonEl = commandEl.createEl('button', `delete-command-${cIndex}`);

                commandEl.createEl('p', { text: `${cIndex + 1}: ${command.name}`, cls: 'command' });

                setIcon(buttonEl, 'trash');
                buttonEl.onClickEvent(async () => {
                    settings.macros[index].commandIds.splice(cIndex, 1);
                    await this.plugin.saveSettings();
                    this.display();
                });
            });
        });
    }
}
