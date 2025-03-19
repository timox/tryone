<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanban SSIR</title>
  <script src="https://docs.getgrist.com/grist-plugin-api.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
  <style>
    body { 
      font-family: sans-serif; 
      padding: 1em; 
      margin: 0; 
      background: #f5f5f5; 
    }
    #conteneur-kanban { 
      display: flex; 
      gap: 1em; 
      align-items: flex-start; 
      min-height: calc(100vh - 2em); 
      overflow-x: auto; 
      padding-bottom: 1em; 
    }
    .colonne-kanban { 
      flex: 1; 
      min-width: 300px; 
      background: #f8f9fa; 
      border-radius: 8px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
      display: flex;
      flex-direction: column;
    }
    .entete-colonne { 
      padding: 1em; 
      color: white; 
      border-radius: 8px 8px 0 0; 
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    .entete-a-faire { background-color: #f95c5e; }
    .entete-en-cours { background-color: #417DC4; }
    .entete-en-attente { background-color: #FFD166; }
    .entete-bloque { background-color: #FF9800; }
    .entete-validation { background-color: #9C27B0; }
    .entete-termine { background-color: #27a658; }
    .contenu-colonne {
      flex: 1;
      padding: 1em;
      overflow-y: auto;
      min-height: 100px;
    }
    .carte { 
      background: white;
      border-radius: 4px; 
      padding: 1em; 
      margin-bottom: 1em;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
      cursor: pointer;
    }
    .carte:hover {
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .titre {
      font-weight: bold;
      margin-bottom: 0.5em;
    }
    .description {
      font-size: 0.9em;
      margin-bottom: 0.5em;
    }
    .details {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5em;
      margin-bottom: 0.5em;
    }
    .projet-tag {
      font-size: 0.8em;
      padding: 0.2em 0.5em;
      background: #f0f0f0;
      border-radius: 3px;
      color: red;
      border: 1px solid red;
    }
    .responsable-badge {
      font-size: 0.8em;
      background: #3498db;
      color: white;
      padding: 0.2em 0.5em;
      border-radius: 3px;
    }
    .deadline {
      font-size: 0.8em;
      color: #e74c3c;
    }
    .bouton-ajouter {
      margin: 1em;
      padding: 0.5em 1em;
      background: #f0f0f0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .bouton-ajouter:hover {
      background: #e0e0e0;
    }
    .popup {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      justify-content: center;
      align-items: center;
    }
    .popup-content {
      background: white;
      padding: 2em;
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1em;
      max-height: 85vh;
      overflow-y: auto;
    }
    .popup-field {
      display: flex;
      flex-direction: column;
    }
    .popup-field label {
      margin-bottom: 0.5em;
      font-weight: bold;
    }
    .popup-field input,
    .popup-field select,
    .popup-field textarea {
      padding: 0.5em;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .popup-field textarea {
      min-height: 100px;
    }
    #popup-description, #popup-notes {
      grid-column: 1 / -1;
      min-height: 150px;
    }
    .popup-actions {
      grid-column: 1 / -1;
      text-align: right;
    }
    .popup-actions button {
      padding: 0.5em 1em;
      margin-left: 1em;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .popup-actions button:first-child {
      background-color: #417DC4;
      color: white;
    }
    .popup.visible {
      display: flex;
    }
    .priorite-urgent { border-left: 5px solid red; }
    .priorite-eleve { border-left: 5px solid orange; }
    .priorite-normal { border-left: 5px solid yellow; }
    .priorite-faible { border-left: 5px solid green; }
  </style>
</head>
<body>
   <div id="conteneur-kanban"></div>
  
  <div id="popup-tache" class="popup">
    <div class="popup-content">
      <h2>Modifier la tâche</h2>
      <div class="popup-field">
        <label for="popup-titre">Titre</label>
        <input type="text" id="popup-titre" placeholder="Titre">
      </div>
      <div class="popup-field">
        <label for="popup-projet">Projet</label>
        <select id="popup-projet"></select>
      </div>
      <div class="popup-field">
        <label for="popup-description">Description</label>
        <textarea id="popup-description" placeholder="Description"></textarea>
      </div>
      <div class="popup-field">
        <label for="popup-statut">Statut</label>
        <select id="popup-statut"></select>
      </div>
      <div class="popup-field">
        <label for="popup-bureau">Bureau</label>
        <select id="popup-bureau" multiple></select>
      </div>
      <div class="popup-field">
        <label for="popup-qui">Responsable(s)</label>
        <select id="popup-qui" multiple></select>
      </div>
      <div class="popup-field">
        <label for="popup-urgence">Urgence</label>
        <select id="popup-urgence"></select>
      </div>
      <div class="popup-field">
        <label for="popup-impact">Impact</label>
        <select id="popup-impact"></select>
      </div>
      <div class="popup-field">
        <label for="popup-priorite">Priorité</label>
        <span id="popup-priorite"></span>
      </div>
      <div class="popup-field">
        <label for="popup-date-echeance">Date d'échéance</label>
        <input type="date" id="popup-date-echeance">
      </div>
      <div class="popup-field">
        <label for="popup-strategie">Stratégie</label>
        <select id="popup-strategie"></select>
      </div>
      <div class="popup-field">
        <label for="popup-action">Action</label>
        <input type="text" id="popup-action" placeholder="Action">
      </div>
      <div class="popup-field">
        <label for="popup-notes">Notes</label>
        <textarea id="popup-notes" placeholder="Notes"></textarea>
      </div>
      <div class="popup-actions">
        <button onclick="sauvegarderTache()">Enregistrer</button>
        <button onclick="supprimerTache()">Supprimer</button>
        <button onclick="fermerPopup()">Fermer</button>
      </div>
    </div>
  </div>


</body>
</html>
