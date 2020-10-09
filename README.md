# lightning-folder

`lightning-folder` is a Lightning Web Component displays Salesforce's folder of a structural hierarchy.
Using [fancyTree lib](https://github.com/mar10/fancytree/).

## Table of Contents

- [Install](#install)
- [lightning-folder Props](#lightning-folder-props)

## Install

There are two ways to install this component:

- [Using a Scratch Org](#installing-to-your-org): This is the recommended installation option. Use this option if you are a developer who wants to experience the code.
- [Using an Unmanaged Package](#installing-using-an-unmanaged-package): This option allows anybody to experience the sample app without installing a local development environment.

### Installing to your Org

1. Set up your environment. Follow the steps in the [Quick Start: Lightning Web Components](https://trailhead.salesforce.com/content/learn/projects/quick-start-lightning-web-components/) Trailhead project. The steps include:

- Install Salesforce CLI
- Install Visual Studio Code
- Install the Visual Studio Code Salesforce extensions, including the Lightning Web Components extension

2. If you haven't already done so, authenticate with your org

```
sfdx force:auth:web:login
```

3. Clone the repository:

```
git clone https://github.com/hanabiiii/lightning-folder.git
cd lightning-folder
```

4. Deploy the component to your org:

```
sfdx force:source:deploy -x manifest/package.xml -u [your-account]
```

### Installing using an Unmanaged Package

Please check [release page](https://github.com/hanabiiii/lightning-folder/releases) to install the unmanaged package in your org.

## `lightning-folder` props

| Name             | Type             | Description                                                                                                                                                                 |
| ---------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon`           | `boolean/string` | Define the folder icon. `true` for default skin's icon, `false` to hide the icon, `salesforce` for Salesforce's doctype folder icon.                                        |
| `skin`           | `string`         | fancyTree's skin. Accepted include `awesome`, `bootstrap`, `bootstrap-n`, `lion`, `material`, `themeroller`, `vista`, `win7`, `win8` (default), `win8-n`, `win8-xxl`, `xp`. |
| `selectedFolder` | `string`         | Id of the selected folder.                                                                                                                                                  |
| `onselect`       | `event`          | An event that is called when click/enter on a folder.                                                                                                                       |

### Custom Events

`select`

The event fired when a folder is selected.
The change event returns the following parameter.
| Parameter | Type | Description |
| ----------------- | ----------- | ------------------------------------------------- |
| `folderId` | `string` | The Content Folder Id of the selected folder. |
| `folderLabel` | `string` | The Content Folder Label of the selected folder. |
| `rootFolderId` | `string` | The Content Workspace Id. |
