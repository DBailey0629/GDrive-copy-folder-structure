/**
 * This Gmail add-on allows the user to save a folder structure into another folder
 * including on a Google Shared Drive.
 * 
 * To Install: Share with a new user as editor. They must open the script, click
 * "Deploy > Test Deployment > Install"
 */

var j=0;
/**
 * Callback for rendering the homepage card.
 * @return {CardService.Card} The card to show to the user.
 */
function onHomepage(e) {
  console.log(e);
  var hour = Number(Utilities.formatDate(new Date(), e.userTimezone.id, 'H'));
  var message;
  if (hour >= 6 && hour < 12) {
    message = 'Good morning';
  } else if (hour >= 12 && hour < 18) {
    message = 'Good afternoon';
  } else {
    message = 'Good night';
  }
  message += ' ' + e.hostApp;
  return createCatCard(message, true);
}

/**
 * Creates a card with an image of a cat, overlayed with the text.
 * @param {String} text The text to overlay on the image.
 * @param {Boolean} isHomepage True if the card created here is a homepage;
 *      false otherwise. Defaults to false.
 * @return {CardService.Card} The assembled card.
 */
function createCatCard(text, isHomepage) {
  // Explicitly set the value of isHomepage as false if null or undefined.
  if (!isHomepage) {
    isHomepage = false;
  }


  // Use the "Cat as a service" API to get the cat image. Add a "time" URL
  // parameter to act as a cache buster.
  var now = new Date();
  // Replace formward slashes in the text, as they break the CataaS API.
  var caption = text.replace(/\//g, ' ');
  Logger.log(caption + " " + text);
  var imageUrl =
      Utilities.formatString('https://cataas.com/cat/says/%s?time=%s',
          encodeURIComponent(caption), now.getTime());
  var image = CardService.newImage()
      .setImageUrl(imageUrl)
      .setAltText('Meow')

  // Create a button that changes the cat image when pressed.
  // Note: Action parameter keys and values must be strings.
  var action = CardService.newAction()
      .setFunctionName('onChangeCat')
      .setParameters({text: text, isHomepage: isHomepage.toString()});
  var button = CardService.newTextButton()
      .setText('Change the cat!')
      .setOnClickAction(action)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED);
  var buttonSet = CardService.newButtonSet()
      .addButton(button);

  // Create a footer to be shown at the bottom.
  var footer = CardService.newFixedFooter()
      .setPrimaryButton(CardService.newTextButton()
          .setText('Powered by cataas.com')
          .setOpenLink(CardService.newOpenLink()
              .setUrl('https://cataas.com')));

  // Assemble the widgets and return the card.
  var section = CardService.newCardSection()
      .addWidget(image)
      .addWidget(buttonSet);

  var card = CardService.newCardBuilder()
      .addSection(section)
      .setFixedFooter(footer);

  if (!isHomepage) {
    // Create the header shown when the card is minimized,
    // but only when this card is a contextual card. Peek headers
    // are never used by non-contexual cards like homepages.
    var peekHeader = CardService.newCardHeader()
      .setTitle('Contextual Cat')
      .setImageUrl('https://www.gstatic.com/images/icons/material/system/1x/pets_black_48dp.png')
      .setSubtitle(text);
    card.setPeekCardHeader(peekHeader)
  }

  return card.build();
}

/**
 * Callback for the "Change cat" button.
 * @param {Object} e The event object, documented {@link
 *     https://developers.google.com/gmail/add-ons/concepts/actions#action_event_objects
 *     here}.
 * @return {CardService.ActionResponse} The action response to apply.
 */
function onChangeCat(e) {
  // Get the text that was shown in the current cat image. This was passed as a
  // parameter on the Action set for the button.
  var text = e.parameters.text;

  // The isHomepage parameter is passed as a string, so convert to a Boolean.
  var isHomepage = e.parameters.isHomepage === 'true';

  // Create a new card with the same text.
  var card = createCatCard(text, isHomepage);

  // Create an action response that instructs the add-on to replace
  // the current card with the new one.
  var navigation = CardService.newNavigation()
      .updateCard(card);
  var actionResponse = CardService.newActionResponseBuilder()
      .setNavigation(navigation);
  return actionResponse.build();
}


/**
 * Callback for rendering the card for specific Drive items.
 * @param {Object} e The event object.
 * @return {CardService.Card} The card to show to the user.
 */
function onDriveItemsSelected(e) {
    let items = e.drive.selectedItems;
    if (items.length != 1 || items[0].mimeType != 'application/vnd.google-apps.folder') {
    return createCatCard("Please select a single folder \n to copy the structure");
  }

  Logger.log(items[0].id);
  let card = createFolderCard(items[0].id);
  return card.build();

}


/**
 * Creates a card to allow user to select the copyToFolder and verify the
 * copyFromFolder
 * @param {text} copyFromFolderId The Id of the folder to copy from.
 * @param {text} copyToFolderId The Id of the folder to copy to.
 * @return {CardService.Card} The assembled card.
 */
function createFolderCard(copyFromFolderId, copyToFolderId = "rootCard") {  
  //Create top section with folders
  let folderSection = CardService.newCardSection()
      .setHeader("Copying To ...")
      .addWidget(getFolderGroup(copyFromFolderId, copyToFolderId));
  
  var sectionSaveSelection = CardService.newCardSection()
      .setHeader("Copying From ... (only the sub-folders get copied!)")
      .addWidget(CardService.newTextParagraph().setText(DriveApp.getFolderById(copyFromFolderId).getName()));

  // Create a footer with button that saves the folder structure when pressed.
  // Note: Action parameter keys and values must be strings.
  var action = CardService.newAction()
      .setFunctionName('saveFolderStructure');
      //.setParameters({messageId: messageId, accessToken: accessToken});
  var button = CardService.newTextButton()
      .setText('Copy Folder Structure!')
      .setOnClickAction(action)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED);

  // Create a footer to be shown at the bottom.
  var footer = CardService.newFixedFooter()
      .setPrimaryButton(button);

  //build the card with all sections
  var card = CardService.newCardBuilder()
      .addSection(folderSection)
      .addSection(sectionSaveSelection);
  
  //Only show the foot to save if in an actual folder
  if (copyToFolderId.length > 9) {
    card = card.setFixedFooter(footer);
  }

  return card;
}


/**
 * Creates the section for listing folders
 *
 * @param {text} copyFromFolderId The Id of the folder to copy from.
 * @param {text} copyToFolderId The Id of the folder to copy to.
 * @return {Object} The completed card section
 */
function getFolderGroup(copyFromFolderId, copyToFolderId = "rootCard") {
  //check if folder ID is at least a string
  if (typeof copyToFolderId !== 'string' ) {
    Logger.log ("folder ID is not a string: " + copyToFolderId);
    return; //should create an error card to user too.
  }
  
  let folderGroup = null;
  
  switch (copyToFolderId) {
    case "rootCard": {
      folderGroup = CardService.newButtonSet();
      //add the "My Drive" and "Shared Drives"  
      folderGroup = folderGroup
          .addButton(CardService.newTextButton().setText("My Drive").setTextButtonStyle(CardService.TextButtonStyle.FILLED).setOnClickAction(CardService.newAction().setFunctionName('handleFolderChange').setParameters({folder: "root", folderFrom: copyFromFolderId})))
          .addButton(CardService.newTextButton().setText("Shared Drives").setTextButtonStyle(CardService.TextButtonStyle.FILLED).setOnClickAction(CardService.newAction().setFunctionName('handleFolderChange').setParameters({folder: "shared", folderFrom: copyFromFolderId})));
      return folderGroup;
      break;
    }

    case "shared": {
      folderGroup = CardService.newButtonSet();
      let folders = Drive.Drives.list({});
      if (folders.items && folders.items.length > 0) {
        for (let ij = 0; ij < folders.items.length; ij++) {
          let folder = folders.items[ij];
          folderGroup = folderGroup
              .addButton(CardService.newTextButton().setText(folder.name).setTextButtonStyle(CardService.TextButtonStyle.FILLED).setOnClickAction(CardService.newAction().setFunctionName('handleFolderChange').setParameters({folder: folder.id, folderFrom: copyFromFolderId})));
        }
      }
      return folderGroup;
      break;
    }

    default: {
      let folders = [];
      folderGroup = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.RADIO_BUTTON)
        .setTitle("Choose the folder in which to save the folder structure")
        .setFieldName("folder_selected");
      
      if (DriveApp.getFolderById(copyToFolderId).getName() == "Drive"){
        folderGroup = folderGroup
          .addItem(Drive.Drives.get(copyToFolderId).name, copyToFolderId, true);
        
        let driveId = "";
        try { driveId =  Drive.Files.get(copyToFolderId).driveId; 
          Logger.log(driveId);}
        catch (e) { driveId = copyToFolderId;}
        
        folders = Drive.Files.list({
        q: "'" + copyToFolderId + "' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.shortcut')",
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: driveId,
        supportsAllDrives: 'true',
        maxResults: 100
      });
        
      } else {
        folderGroup = folderGroup
            .addItem(DriveApp.getFolderById(copyToFolderId).getName(), copyToFolderId, true);
              
        folders = Drive.Files.list({
          q: "'" + copyToFolderId + "' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.shortcut')",
          includeItemsFromAllDrives: true,
          supportsAllDrives: 'true',
          maxResults: 100
        });
      }

      if (folders.items && folders.items.length > 0) {
        for (let ij = 0; ij < folders.items.length; ij++) {
          let folder = folders.items[ij];
          if (folder.mimeType == "application/vnd.google-apps.folder") {
            folderGroup = folderGroup.addItem(folder.title, folder.id, false);
            //Logger.log(folder);
          } else {
            if (DriveApp.getFileById(folder.id).getTargetMimeType() == "application/vnd.google-apps.folder") {
              folderGroup = folderGroup.addItem(folder.title, DriveApp.getFileById(folder.id).getTargetId(), false);
            }
          } 
        }
      }
    }
  }

  folderGroup = folderGroup
      .setOnChangeAction(CardService.newAction()
          .setFunctionName("handleFolderChange")
          .setParameters({folderFrom: copyFromFolderId}));

  return folderGroup;
}

/**
 * Called when user selects folder.
 * @param {Object} radiochange The event object, documented {@link
 *     https://developers.google.com/gmail/add-ons/concepts/actions#action_event_objects
 *     here}.
 * @return {CardService.ActionResponse} The action response to apply.
 */
function handleFolderChange(radiochange) {
  let folder_selectedId = radiochange.parameters.folder || radiochange.formInput.folder_selected;
  let copyFromFolderId = radiochange.parameters.folderFrom;
  Logger.log(radiochange);

  // Create a new card.
  var card = createFolderCard(copyFromFolderId, folder_selectedId).build();

  // Create an action response that instructs the add-on to push a new card onto the stack.
  var navigation = CardService.newNavigation()
      .pushCard(card);
  var actionResponse = CardService.newActionResponseBuilder()
      .setNavigation(navigation);
  return actionResponse.build();
}



/**
 * Callback for iterating and saving folder structure.
 * @param {Object} e The event handler with parameters embedded
 * @return {CardService.Card} The card to show to the user.
 */
function saveFolderStructure(e) {
  let folderToCopyFrom = e.drive.selectedItems[0].id;
  let newParentFolder = e.formInput.folder_selected;

  //get first layer of subfolders
  let subfolders = Drive.Files.list({
          q: "'" + folderToCopyFrom + "' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'",
          includeItemsFromAllDrives: true,
          supportsAllDrives: 'true',
          maxResults: 100
        });
  
  let newFolders = [];
  for (const element of subfolders.items) {
    newFolders.push([element.title, element.id, element.parents[0].id]);
  }

  Logger.log(newFolders);

  //call subSubFolders function to start iterating through folders
  newFolders = subSubFolders(newFolders);

  
  saveSubFolderStructure(newParentFolder, newFolders);

  //
  //Need code for writing new folders
  //



/*  while (i < subfolders.items.length) {
 /*   let newId = Drive.Files.insert({
      "title": subfolders.items[i].title,
      "mimeType": "application/vnd.google-apps.folder",
      "parents": [
        {
          "id": newParentFolder
        }
      ]},null,{
      "supportsAllDrives": "true"
    }).id;
    newFolders[j] = [];
    newFolders[j][0] = subfolders.items[i].title;
    newFolders[j][1] = subfolders.items[i].id;
    newFolders[j][2] = subfolders.items[i].parents[0].id;


//    maxFolders++;
    j++;
    let subSubFolders = Drive.Files.list({
          q: "'" + subfolders.items[i].id + "' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'",
          includeItemsFromAllDrives: true,
          supportsAllDrives: 'true',
          maxResults: 100
        });
    if (subSubFolders.items.length > 0) 
      {saveFolderStructure(e, subfolders.items[i].id, "newId", subSubFolders, newFolders); }

    i++;
  }*/
  
//  return createCatCard("Folder Structure Created!");
  //Logger.log(newFolders[1][0] + newFolders[1][1] + newFolders[1][2]);
  return;
}



/**
 * Callback for iterating through and finding all subfolders.
 * @param {Object} newFolders Array holding list of all top level subfolders
 * @return {Object} newFolders Array holding list of all subfolders
 */
function subSubFolders(newFolders) {
  for (const element of newFolders) {
    //get subfolders
    //Logger.log(element);
    let subfolders = Drive.Files.list({
            q: "'" + element[1] + "' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'",
            includeItemsFromAllDrives: true,
            supportsAllDrives: 'true',
            maxResults: 100
          });

    //push new subfolders onto array
    for (const element2 of subfolders.items) {
      newFolders.push([element2.title, element2.id, element2.parents[0].id]);
    }
  }
  //Logger.log(newFolders);

  return newFolders;
}

function saveSubFolderStructure(newParentFolder, newFolders) {
//  Logger.log(folderToCopyFrom + "-->" + newParentFolder);
  //let newFolderMap = [[newFolders[0][2],newParentFolder]];
  let parentold = [newFolders[0][2]];
  let parentnew = [newParentFolder];
  for (const element of newFolders) {
    //let parentoldindex = parentold.indexOf(element[2]);
    
    let newId = makeNewFolder(element[0],parentnew[parentold.lastIndexOf(element[2])]);
    /*let newId = Drive.Files.insert({
      "title": element[0],
      "mimeType": "application/vnd.google-apps.folder",
      "parents": [
        {
          "id": parentnew[parentold.lastIndexOf(element[2])]
        }
      ]},null,{
      "supportsAllDrives": "true"
    }).id;*/

    parentold.push(element[1]);
    parentnew.push(newId);
  }
  
//  return createCatCard("Folder Structure Created!");
  return;
}

function makeNewFolder(title, parentid) {
  let newId = Drive.Files.insert({
      "title": title,
      "mimeType": "application/vnd.google-apps.folder",
      "parents": [
        {
          "id": parentid
        }
      ]},null,{
      "supportsAllDrives": "true"
    }).id;

  return newId;
}
