import { LightningElement, api, track } from "lwc";
import { loadStyle, loadScript } from "lightning/platformResourceLoader";
import FANCYTREE from "@salesforce/resourceUrl/otFancytree";
import JQUERY from "@salesforce/resourceUrl/otJquery";

import getContentWorkspace from "@salesforce/apex/LightningFolderController.getContentWorkspace";
import getContentFolder from "@salesforce/apex/LightningFolderController.getContentFolder";
import getFolderPath from "@salesforce/apex/LightningFolderController.getFolderPath";

export default class LightningFolder extends LightningElement {
  @api skin = "win8";
  @api icon = "salesforce"; //true: default theme icon, false: hide icon, salesforce: sf-folder-icon

  @track _selectedFolder;

  @track isLoading = false;
  @track isLoadingFolderPath = false;

  @api get selectedFolder() {
    return this._selectedFolder;
  }
  set selectedFolder(value) {
    this._selectedFolder = value;
    this.handleOnSelectedFolderChange();
  }

  _folderIdLoadedChild = [];

  _fancytreeInitialized = false;
  _fancyTreeRendered = false;
  _fancytreeInitialFailed = false;

  renderedCallback() {
    if (this._fancytreeInitialized) return;
    this.isLoading = true;
    this._fancytreeInitialized = true;

    loadScript(this, JQUERY)
      .then(() => {
        Promise.all([
          loadScript(this, FANCYTREE + "/jquery.fancytree-all-deps.min.js"),
          loadScript(this, FANCYTREE + "/jquery.fancytree.min.js"),
          loadStyle(
            this,
            FANCYTREE + `/skin-${this.fancyTreeSkin}/ui.fancytree.min.css`
          )
        ])
          .then(() => {
            this.initializeFancytree();
          })
          .catch((error) => {
            console.error(error);
            this._fancytreeInitialFailed = true;
          })
          .then(() => {
            // re-try if error
            if (this._fancytreeInitialFailed) this.initializeFancytree();
          })
          .catch(() => {
            this.isLoading = false;
          });
      })
      .catch((jqError) => {
        console.error(jqError);
        this.isLoading = false;
      });
  }

  get fancyTreeSkin() {
    switch (this.skin) {
      case "awesome":
      case "bootstrap":
      case "bootstrap-n":
      case "lion":
      case "material":
      case "themeroller":
      case "vista":
      case "win7":
      case "win8":
      case "win8-n":
      case "win8-xxl":
      case "xp":
        return this.skin;
      default:
        return "win8";
    }
  }

  get fancyTreeInstance() {
    const treeEl = this.template.querySelector(".lf-fancytree");
    let fancyTree;

    if (treeEl) {
      const j$ = jQuery.noConflict();
      fancyTree = j$.ui.fancytree.getTree(treeEl);
    } else {
      console.warn("fancyTree element not found");
    }

    return fancyTree;
  }

  async initializeFancytree() {
    const treeEl = this.template.querySelector(".lf-fancytree");
    if (treeEl) {
      try {
        const wsData = await getContentWorkspace();
        let workspace = wsData; //JSON.parse(data);
        // console.log('workspace', wsData);
        if (workspace) {
          workspace = workspace.sort(this.sortLabelValues).map((ws) => {
            let item = ws;
            item.key = item.id;
            item.title = item.label;
            item.folder = true;
            if (item.hasChild) {
              item.lazy = true;
            }
            return item;
          });
        }

        const j$ = jQuery.noConflict();
        const fancyTree = j$(treeEl).fancytree({
          source: workspace,
          //debugLevel: 4,
          clickFolderMode: 1,
          selectMode: 1,
          focusOnSelect: true,
          tooltip: true,
          tabindex: "0",
          titlesTabbable: true,
          init: (event, data) => {
            this._fancyTreeRendered = true;
            this.isLoading = false;
            if (this.selectedFolder)
              this.toggleTargetFolder(this.selectedFolder);
          },
          icon: (event, data) => {
            if (data.node.folder && this.icon === "salesforce") {
              const folderHref =
                "/_slds/icons/doctype-sprite/svg/symbols.svg#folder";
              return {
                html: `<svg class="slds-icon slds-icon_x-small"><use xlink:href="${folderHref}"></use></svg>`
              };
            }
            return this.icon === "true" || this.icon === true;
          },
          click: (event, data) => {
            //console.log('on click', data);
            if (data.targetType == "icon" || data.targetType == "title") {
              this.setSelectNode(data.node);
            }
          },
          lazyLoad: (event, data) => {
            var node = data.node;
            //console.log('getContentFolder', node);
            data.result = this.lazyloadFolder(node.key).promise();
          },
          keydown: (event, data) => {
            //console.log('on keydown', data);
            if (event.keyCode == 13) {
              //enter
              const tree = data.tree;
              const focusNode = tree.focusNode;
              this.setSelectNode(focusNode);
            }
          }
        });
      } catch (err) {
        console.warn("generate folder tree error", err);
        this.isLoading = false;
      }
    } else {
      console.warn("generate folder tree error", "tree el not found");
      this.isLoading = false;
    }
  }

  lazyloadFolder(folderId) {
    const j$ = jQuery.noConflict();
    const dfd = new j$.Deferred();

    getContentFolder({ parentFolderId: folderId })
      .then((foData) => {
        let folderItems = foData; //JSON.parse(data);
        // console.log('folderItems', folderItems);

        this.updateFolderIdLoadedChild(folderId);

        if (folderItems) {
          folderItems = folderItems.sort(this.sortLabelValues).map((fi) => {
            let item = fi;
            item.key = item.id;
            item.title = item.label;
            item.folder = true;
            if (item.hasChild) {
              item.lazy = true;
            }
            return item;
          });
        }
        dfd.resolve(folderItems);
        dfd.done();
      })
      .catch(() => {
        dfd.resolve([]);
        dfd.done();
      });

    return dfd;
  }

  updateFolderIdLoadedChild(folderId) {
    const folderIdLoadedChild = new Set(this.folderIdLoadedChild);
    folderIdLoadedChild.add(folderId);
    this.folderIdLoadedChild = Array.from(folderIdLoadedChild.values());
    // console.log('loaded folder/s child', Array.from(folderIdLoadedChild.values()));
  }

  handleOnSelectedFolderChange() {
    if (!this.fancyTreeRendered) return;
    if (!this.isLoadingFolderPath) return;
    this.toggleTargetFolder(cmp, this.selectedFolder);
  }

  toggleTargetFolder(selectedFolder) {
    const fancyTree = this.fancyTreeInstance;

    if (fancyTree && selectedFolder) {
      const selectedNodes = fancyTree.getSelectedNodes();
      const filterSelectedNodes = (node) => {
        return node.key == selectedFolder;
      };

      if (
        selectedFolder &&
        selectedNodes &&
        selectedNodes.filter(filterSelectedNodes).length > 0
      ) {
        //console.log('selected Folder and Nodes', selectedFolder, selectedNodes);
        return;
      }

      this.isLoadingFolderPath = true;

      getFolderPath({ folderId: selectedFolder })
        .then((data) => {
          // console.log(selectedFolder + ' path', data);
          const part = data.split("/");

          const findSelectedNode = (part) => {
            const nodeKey = part.slice(0, 1)[0];
            const newPath = part.slice(1);
            // console.log('find node w key', nodeKey);
            const node = fancyTree.getNodeByKey(nodeKey);
            if (!nodeKey) return;

            if (
              nodeKey == selectedFolder ||
              (node.data &&
                node.data.isWorkspace &&
                node.data.workSpaceId == selectedFolder)
            ) {
              node.setSelected(true);
              node.setActive(true);
              // console.log('found node w key', nodeKey);
              cmp.set("v.isLoadingFolderPath", false);
            } else {
              const forceReload =
                this.folderIdLoadedChild.indexOf(nodeKey) == -1 ? true : false;
              node
                .load(forceReload)
                .then(() => {
                  // console.log('loaded child of', nodeKey);
                  node.setExpanded(true);
                  findSelectedNode(newPath);
                })
                .catch(() => {
                  // console.log('error load child of', nodeKey);
                  this.isLoadingFolderPath = false;
                });
            }
          };
          findSelectedNode(part);
        })
        .catch(() => {
          this.isLoadingFolderPath = false;
        });
    }
  }

  getRootOfSelectedFolder() {
    let result = {};
    const fancyTree = this.fancyTreeInstance;
    if (fancyTree) {
      try {
        const selectedFolder = this.selectedFolder;
        const selectedNodes = fancyTree.getSelectedNodes();
        const filterSelectedNodes = (node) => {
          return node.key == selectedFolder;
        };
        const targetSelectedNode = selectedNodes.filter(filterSelectedNodes)[0];
        if (targetSelectedNode) {
          let lastNodeData = targetSelectedNode.data;
          let parentNode = targetSelectedNode.parent;
          while (parentNode) {
            if (parentNode.key && parentNode.key.indexOf("07H") == -1) break; //ignore fancy root node
            lastNodeData = parentNode.data;
            parentNode = parentNode.parent;
          }
          result = lastNodeData;
        }
      } catch (err) {
        console.warn("getRootOfSelectedFolder", err);
      }
    }
    //console.log('getRootOfSelectedFolder', result);
    return result;
  }

  setSelectNode(node) {
    if (!node || (node && node.selected)) return;

    node.setActive(true);
    node.setSelected(true);
    this.selectedFolder = node.key;
    this.fireSelectEvent(node.key, node.title);
  }

  fireSelectEvent(folderId, folderLabel) {
    try {
      const parentFolder = this.getRootOfSelectedFolder();
      const onSelect = new CustomEvent("select", {
        detail: {
          folderId: folderId,
          folderLabel: folderLabel,
          rootFolderId: parentFolder.isWorkspace
            ? parentFolder.workSpaceId
            : parentFolder.id
        }
      });
      this.dispatchEvent(onSelect);
    } catch (err) {
      console.log(err);
    }
  }

  sortLabelValues(a, b) {
    if (a.label < b.label) {
      return -1;
    }
    if (a.label > b.label) {
      return 1;
    }
    return 0;
  }
}
