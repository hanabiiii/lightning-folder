@isTest
public class LightningFolderController_Test {
    
    @isTest(seeAllData=true)
    public static void testGetContentWorkspace() {
        List<LightningFolderController.TreeItem> items = LightningFolderController.getContentWorkspace();
        System.assertNotEquals(null, items);
    }

    @isTest(seeAllData=true)
    public static void testGetContentFolder() {
        List<ContentFolder> folders = Database.query('SELECT Id, Name FROM ContentFolder where ParentContentFolderId = null LIMIT 1');
        if (folders != null && folders.size() > 0) {
            
            List<LightningFolderController.TreeItem> items = LightningFolderController.getContentFolder(folders[0].Id);
            System.assertNotEquals(null, items);
        }
    }

    @isTest(seeAllData=true)
    public static void testGetFolderPath() {
        List<ContentFolder> folders = Database.query('SELECT Id, Name FROM ContentFolder where ParentContentFolderId != null LIMIT 1');
        if (folders != null && folders.size() > 0) {
            
            String path = LightningFolderController.getFolderPath(folders[0].Id);
            System.assertNotEquals(folders[0].Id, path);
        }
    }
}