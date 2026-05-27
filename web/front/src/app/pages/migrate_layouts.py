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
        
        new_content = content
        
        # Imports
        new_content = new_content.replace('import { MedecinLayout } from \'../components/MedecinLayout\';', 'import { DashboardLayout } from "../components/DashboardLayout";')
        new_content = new_content.replace('import { MedecinLayout } from "../components/MedecinLayout";', 'import { DashboardLayout } from "../components/DashboardLayout";')
        new_content = new_content.replace('import MedecinLayout from "../components/MedecinLayout";', 'import { DashboardLayout } from "../components/DashboardLayout";')
        
        new_content = new_content.replace('import { AdminLayout } from "./AdminLayout";', 'import { DashboardLayout } from "../components/DashboardLayout";')
        new_content = new_content.replace('import AdminLayout from "./AdminLayout";', 'import { DashboardLayout } from "../components/DashboardLayout";')
        
        # Tags
        new_content = new_content.replace('<MedecinLayout>', '<DashboardLayout>')
        new_content = new_content.replace('</MedecinLayout>', '</DashboardLayout>')
        new_content = new_content.replace('<AdminLayout>', '<DashboardLayout>')
        new_content = new_content.replace('</AdminLayout>', '</DashboardLayout>')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Processed {filename}')
        else:
            print(f'No changes for {filename}')
    else:
        print(f'File {filename} not found')
