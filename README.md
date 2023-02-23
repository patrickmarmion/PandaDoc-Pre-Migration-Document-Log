# PandaDoc-Workspace-Document-Log
Prerequisites:

Setting up OAuth 2.0 using Google:

Go to the Google Cloud Platform Console. From the projects list, select a project or create a new one.
If this is your first time or a new project, you will need to go to Enable APIs and Services on the left side menu:
Add APIs and Services
Search for Google Sheets and enable the Google Sheets API. 
Then click OAuth consent Screen on the left side menu:
The project can be External 
Assign a Name, e.g. Migration, your email as the support email and developer contact email at the bottom of the screen. 
Add the following scope from the Google Sheets API: “../auth/spreadsheet” then click Save and Continue
Add your email as a test user, click Save and Continue and then Back to Dashboard


Open Credentials from the console left side menu:
Click New Credentials, then select OAuth client ID.
Select Web Application and give the App a name.
Add an authorised redirect URI as:    http://localhost and create the Credentials.
After being redirected, download the JSON file of your OAuth client. 


NPM Modules

Install Node or make sure that you're running v16+
Make a directory where you will store the files and navigate to this directory on your terminal. 
Install the following NPM Modules:
Dotenv
Google APIs
Axios
Readline-promise

Fork & Clone this Repo

Bring the code into the directory that you created earlier
