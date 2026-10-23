We need to add an ability for user to log in  via spabase. There will 2 options :
1 - for local developoment to work infornt SFT-DEV project
2-  for production SFT project

Once the user have been logged in for the first time ti will be stored in the DB table
The table will be used in the future to mange users  and connect them to the fight lists they createed , fight test, to enable share fight test among them.
There should be created one more lookup table with user roles. Right now there will be only 3 roles - student , sys-admin and guest. All users will be of student role. The role consist of permissions. There will be permissions table, so for example there are permissions:
play-fight-list
edit-fight-list
share-fight-list

role student (for example ) will consist only from:
play-fight-list
edit-fight-list

So the student will not be able to share.
(Again right now we are NOT implementing sharing it was just an example for future)
each operation will have list of required permissions, if the role has all required permissions it will be able to execute the action.
