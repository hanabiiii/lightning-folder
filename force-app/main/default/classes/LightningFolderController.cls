public with sharing class LightningFolderController {
    
    @AuraEnabled
    public static List<TreeItem> getContentWorkspace() {
        List<ContentWorkspace> wsList = Database.query('Select Id, Name FROM ContentWorkspace ORDER BY Name asc');
        
        Map<Id, TreeItem> tree = new Map<Id, TreeItem>();
        Map<Id, Id> wsContentFolderIds = new Map<Id, Id>();
        Map<Id, String> wsName = new Map<Id, String>();
        for (ContentWorkspace ws : wsList) {
            wsContentFolderIds.put(ws.Id, null);
            wsName.put(ws.Id, ws.Name);
            
            tree.put(ws.Id, new TreeItem(ws.Id, ws.Name, false, true, ws.Id));
        }
        if (!(wsContentFolderIds.size() > 0)) return tree.values();
        
        Set<Id> wsIds = wsContentFolderIds.keySet();
        String wsContentFolderQuery = 'SELECT Id, Name FROM ContentFolder WHERE NAME IN :wsIds ORDER BY Name asc';
        List<ContentFolder> wsContentFolders = Database.query(wsContentFolderQuery);
        
        if(wsContentFolders != null && wsContentFolders.size() > 0) {
            for(ContentFolder wsFolder: wsContentFolders) {
                if (wsContentFolderIds.get(wsFolder.Name) == null) {
                    wsContentFolderIds.put(wsFolder.Name, wsFolder.Id);
                    
                    if (tree.get(wsFolder.Name) != null) {
                        tree.remove(wsFolder.Name);
                    }
                    tree.put(wsFolder.Id, new TreeItem(wsFolder.Id, wsName.get(wsFolder.Name), false, true, wsFolder.Name));
                }
            }
        }
        
        Set<Id> parentContentFolderIds = new Set<Id>();
        for (Id parentId : wsContentFolderIds.values()) {
            if (parentId != null) parentContentFolderIds.add(parentId);
        }
        System.debug(parentContentFolderIds);
        if (!(parentContentFolderIds.size() > 0)) return tree.values();
        
        String countQuery= 'SELECT ParentContentFolderId, COUNT(Id) countChild FROM ContentFolder WHERE ParentContentFolderId IN :parentContentFolderIds GROUP BY ParentContentFolderId';
        List<AggregateResult> aggregateResultList = Database.query(countQuery);
        if(aggregateResultList != null && aggregateResultList.size() > 0) {
            for(AggregateResult aggr: aggregateResultList) {
                TreeItem item = tree.get((Id)aggr.get('ParentContentFolderId'));
                Long childCount = (Long)aggr.get('countChild');
                System.debug((Id)aggr.get('ParentContentFolderId') + ' - ' + childCount);
                if (item != null && childCount > 0) {
                    item.hasChild = true;
                    item.childCount = childCount;
                    tree.put(item.id, item);
                }
            }
        }
        
        return tree.values();
    }

    @AuraEnabled
    public static List<TreeItem> getContentFolder(String parentFolderId) {        
        String folderQuery = 'SELECT Id, Name FROM ContentFolder WHERE ParentContentFolderId=:parentFolderId AND IsDeleted=false ORDER BY Name asc';
        Map<Id, ContentFolder> folderList = new Map<Id, ContentFolder>((List<ContentFolder>)Database.query(folderQuery));
        
        Map<Id, TreeItem> tree = new Map<Id, TreeItem>();
        for (ContentFolder cf : folderList.values()) {
            tree.put(cf.Id, new TreeItem(cf.Id, cf.Name, false, false, null));
        }
        
        Set<Id> parentContentFolderIds = new Set<Id>();
        parentContentFolderIds.addAll(folderList.keySet());
        System.debug(parentContentFolderIds);
        String countQuery= 'SELECT ParentContentFolderId, COUNT(Id) countChild FROM ContentFolder WHERE ParentContentFolderId IN :parentContentFolderIds GROUP BY ParentContentFolderId';
        List<AggregateResult> aggregateResultList = Database.query(countQuery);
        if(aggregateResultList != null && aggregateResultList.size() > 0) {
            for(AggregateResult aggr: aggregateResultList) {
                TreeItem item = tree.get((Id)aggr.get('ParentContentFolderId'));
                Long childCount = (Long)aggr.get('countChild');
                System.debug((Id)aggr.get('ParentContentFolderId') + ' - ' + childCount);
                if (item != null && childCount > 0) {
                    item.hasChild = true;
                    item.childCount = childCount;
                    tree.put(item.id, item);
                }
            }
        }
        
        return tree.values();
    }
    
    @AuraEnabled
    public static String getFolderPath(String folderId) {
		String path = folderId;
        Id checkingId = Id.valueOf(folderId);
        
        if (checkingId.getSobjectType() == Schema.ContentWorkSpace.SObjectType) {
            List<ContentFolder> wsContentFolders = Database.query('SELECT Id, Name FROM ContentFolder WHERE Name=:checkingId ORDER BY Name asc');
            if(wsContentFolders.size() == 1) {
                return wsContentFolders[0].Id;
            }
        }
        
        List<ContentFolder> targetFolders = Database.query('SELECT Id, Name, ParentContentFolderId FROM ContentFolder WHERE Id=:folderId AND IsDeleted=false');
        if (targetFolders.size() > 0) {
            ContentFolder targetFolder = targetFolders[0];
            Integer countLimitQuery = 1;
            while (String.isNotBlank(targetFolder.ParentContentFolderId)) {
                path = targetFolder.ParentContentFolderId + '/' + path;
                if (countLimitQuery >= 99) { // too deep folder, limit 100 soql
                    break;
                }
                
                String parentFolderId = targetFolder.ParentContentFolderId;
                targetFolders = Database.query('SELECT Id, Name, ParentContentFolderId FROM ContentFolder WHERE Id=:parentFolderId AND IsDeleted=false');
                countLimitQuery++;
                
                if (targetFolders.size() > 0) {
                    targetFolder = targetFolders[0];
                } else {
                    break;
                }
            }
            
        }
        
		return path;
    }
    
    public class TreeItem {
        @AuraEnabled public String id { get; set; }
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public Boolean hasChild { get; set; }
        @AuraEnabled public Long childCount { get; set; }
        
        @AuraEnabled public Boolean isWorkspace { get; set; }
        @AuraEnabled public String workSpaceId { get; set; }
        
        public TreeItem(String id, String label, Boolean hasChild, Boolean isWorkspace, String workSpaceId) {
            this.id = id;
            this.label = label;
            this.hasChild = hasChild;
            this.isWorkspace = isWorkspace;
            this.workSpaceId = workSpaceId;
            
            this.childCount = 0;
        }
    }
}