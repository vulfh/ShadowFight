# Fight list feature
## The feature will give a possiblity to the user to create and store its own set of techniques combinations
## instead of "Technique selection" will be "Fight List Selection"

# Fight List selection

## Fight lsit selection is collection of techniques (preset) from all the available techniques which user selected from the technique list

## Each fight list has its name

## The  list of :fight list" is expandable. Meaning the user will be able to expand and collapse each fight list

## Each  Fight list will have a button "Start", "Stop", "Delete"
### Start button starts session thechniques from the fight list. Application will store in the local storage the ID of chosen fight list in the local storage as current
### Stop  button stops session
### Delete deletes whole fight list wtih verification prompt: "Are you sure want to the fight list [Name of the fight list]
#### Once a fight list is deleted and it was stored as current, it should be deleted from the current 

## Start button in the trainning session panel will start current active fight list. If there is no current session application will show Prompt:"There is no selected fight list. Do you want me to run over all the available techniques?" 
### If the user chooses yes the training session start over all the available techniques 
## Stop button in the training session panel will stop current session
## Pause will pause current session

# Fight List  structure
## Fight list consists of technique panel just as it today. 
## The technique panel will have in addition a button with button of recycle bin, clicking on it will remove it from the specific fight list

## The button "Select all" and "Deselect all" will be in each fight list. The functionality of selection/deselection of technique will be the same but in fight list it self. Meaning, there will be possibility select or deselct techinque in the fight list
 - Just as it is now, the shuffle will happen only among selected techniques.
 - If there is no technique selected in the fight list, a toast with notification:"Please select at least one technique in the [Name specific fight list]"

## Instead of "Select all" and "Deselect all" where they are today in Technique selection will be button "New Fight List"
    - Clicking ont the "new Fight List" will show prompt window "Please provide name for the new fight list"
    - After the user entrers the name for the new fight list, application will check the new name for uniqueness, if name already exists, application will notify about that, otherwise it will create new fight list, add it to the collection of all fight lists.
## The collection of all fight lists will be stored in local storage


