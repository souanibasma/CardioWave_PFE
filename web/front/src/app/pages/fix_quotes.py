import os

directory = r'H:\Mediwave_Stage\Project\ECG_classification_models\web\front\src\app\pages'
files_to_process = [
    'AnalyseECG.tsx', 'Articles.tsx', 'ChatbotIA.tsx', 'DossierPatient.tsx', 
    'EcgRecus.tsx', 'MyPatients.tsx', 'Notifications.tsx', 'Parametres.tsx', 
    'PatientDashboard.tsx', 'PlaceholderMedecin.tsx', 'TableauDeBord.tsx',
    'AdminVerification.tsx', 'AdminNotifications.tsx', 'AdminArticles.tsx', 'Admin.tsx'
]

for filename in files_to_process:
    filepath = os.path.join(directory, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Correct escaped quotes
        new_content = content.replace(r"\'", "'")
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Fixed {filename}')
        else:
            print(f'No changes for {filename}')
