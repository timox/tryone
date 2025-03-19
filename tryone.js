const STATUTS = [
  { id: 'À faire', libelle: 'À faire', classe: 'a-faire' },
  { id: 'En cours', libelle: 'En cours', classe: 'en-cours' },
  { id: 'En attente', libelle: 'En attente', classe: 'en-attente' },
  { id: 'Bloqué', libelle: 'Bloqué', classe: 'bloque' },
  { id: 'Validation', libelle: 'Validation', classe: 'validation' },
  { id: 'Terminé', libelle: 'Terminé', classe: 'termine' },
  { id: 'trash', libelle: 'Corbeille', classe: 'trash' }
];

const BUREAUX = ['exploit', 'réseau', 'bdd', 'chefssir'];
const RESPONSABLES = ['Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo', 'Gaël', 'Thomas', 'Elie', 'landry'];
const URGENCES = ['Courte', 'Longue', 'Moyenne', 'Immédiate'];
const IMPACTS = ['Important', 'Modéré', 'Critique', 'Mineur'];

const TABLE_ID = "Ssir_principale_task";
const STRATEGIE_TABLE_ID = "Ssir_strategie";

let currentRecords = [];
let currentTache = null;
let projets = [];
let strategies = [];

function calculerPriorite(impact, urgence) {
  const matrice = {
    "Critique,Immédiate": "Urgent (1)",
    "Critique,Courte": "Urgent (1)",
    "Critique,Moyenne": "Élevé (2)",
    "Critique,Longue": "Élevé (2)",
    "Important,Immédiate": "Urgent (1)",
    "Important,Courte": "Élevé (2)",
    "Important,Moyenne": "Élevé (2)",
    "Important,Longue": "Normal (3)",
    "Modéré,Immédiate": "Élevé (2)",
    "Modéré,Courte": "Normal (3)",
    "Modéré,Moyenne": "Normal (3)",
    "Modéré,Longue": "Faible (4)",
    "Mineur,Immédiate": "Normal (3)",
    "Mineur,Courte": "Normal (3)",
    "Mineur,Moyenne": "Faible (4)",
    "Mineur,Longue": "Faible (4)",
  };
  return matrice[`${impact},${urgence}`] || "Normal (3)";
}

function getCouleurPriorite(priorite) {
  switch(priorite) {
    case "Urgent (1)": return "red";
    case "Élevé (2)": return "orange";
    case "Normal (3)": return "yellow";
    case "Faible (4)": return "green";
    default: return "gray";
  }
}

async function initialiserDonnees() {
  try {
    const strategiesData = await grist.docApi.fetchTable(STRATEGIE_TABLE_ID);
    strategies = Array.isArray(strategiesData) ? strategiesData : [];
    
    projets = [...new Set(currentRecords.map(t => t.projet).filter(Boolean))];
    
    remplirSelect('popup-projet', projets);
    remplirSelect('popup-strategie', strategies.map(s => s.id));
  } catch (erreur) {
    console.error('Erreur lors de l\'initialisation des données:', erreur);
    alert('Erreur lors du chargement des données. Veuillez rafraîchir la page.');
  }
}

function mettreAJourChamp(idTache, champ, valeur) {
  return grist.docApi.applyUserActions([
    ['UpdateRecord', TABLE_ID, parseInt(idTache), {
      [champ]: valeur
    }]
  ]);
}

async function creerNouvelleTache(statut) {
  const nouvelleTache = {
    titre: 'Nouvelle tâche',
    statut: statut,
    projet: '',
    notes: ''
  };
  ouvrirPopup(nouvelleTache);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function creerCarteTache(tache) {
  const carte = document.createElement('div');
  carte.className = 'carte';
  carte.dataset.idTache = tache.id;

  const priorite = calculerPriorite(tache.impact, tache.urgence);
  carte.style.borderLeft = `5px solid ${getCouleurPriorite(priorite)}`;

  carte.innerHTML = `
    <div class="titre">${tache.titre || 'Sans titre'}</div>
    <div class="description">${tache.description || ''}</div>
    <div class="details">
      ${tache.projet ? `<span class="projet-tag">${tache.projet}</span>` : ''}
      ${tache.str_qui ? `<span class="responsable-badge">${tache.str_qui}</span>` : ''}
    </div>
    ${tache.date_echeance ? `<div class="deadline">Échéance: ${formatDate(tache.date_echeance)}</div>` : ''}
  `;

  carte.addEventListener('click', () => ouvrirPopup(tache));
  return carte;
}

function creerColonneKanban(statut) {
  const colonne = document.createElement('div');
  colonne.className = `colonne-kanban colonne-${statut.classe}`;
  
  colonne.innerHTML = `
    <div class="entete-colonne entete-${statut.classe}">
      <h3 class="titre-statut">${statut.libelle}</h3>
      <span class="compteur-colonne">(0)</span>
    </div>
    <div class="contenu-colonne" data-statut="${statut.id}"></div>
  `;
  
  const boutonAjouter = document.createElement('button');
  boutonAjouter.className = 'bouton-ajouter';
  boutonAjouter.textContent = '+ Ajouter une tâche';
  boutonAjouter.onclick = () => creerNouvelleTache(statut.id);
  
  colonne.insertBefore(boutonAjouter, colonne.querySelector('.contenu-colonne'));
  
  return colonne;
}

function toggleColonne(colonne) {
  colonne.classList.toggle('collapsed');
  const contenu = colonne.querySelector('.contenu-colonne');
  contenu.style.display = colonne.classList.contains('collapsed') ? 'none' : 'block';
}

function afficherKanban(taches) {
  if (!Array.isArray(taches)) {
    console.error('afficherKanban: taches n\'est pas un tableau', taches);
    taches = [];
  }
  
  const conteneur = document.getElementById('conteneur-kanban');
  conteneur.innerHTML = '';

  STATUTS.forEach(statut => {
    if (statut.id !== 'trash') {
      const colonne = creerColonneKanban(statut);
      conteneur.appendChild(colonne);

      const conteneurCartes = colonne.querySelector('.contenu-colonne');
      const tachesColonne = taches.filter(t => t.statut === statut.id || t.str_statut === statut.id)
        .sort((a, b) => {
          const prioriteA = calculerPriorite(a.impact, a.urgence);
          const prioriteB = calculerPriorite(b.impact, b.urgence);
          return prioriteA.localeCompare(prioriteB);
        });
      
      tachesColonne.forEach(tache => {
        conteneurCartes.appendChild(creerCarteTache(tache));
      });
      
      colonne.querySelector('.compteur-colonne').textContent = `(${tachesColonne.length})`;
      
      new Sortable(conteneurCartes, {
        group: 'kanban',
        animation: 150,
        onEnd: function(evt) {
          const idTache = evt.item.dataset.idTache;
          const nouveauStatut = evt.to.dataset.statut;
          mettreAJourChamp(idTache, 'statut', nouveauStatut);
        }
      });
    }
  });
}

function ouvrirPopup(tache) {
  currentTache = tache;
  const popup = document.getElementById('popup-tache');
  document.getElementById('popup-titre').value = tache.titre || '';
  document.getElementById('popup-description').value = tache.description || '';
  document.getElementById('popup-projet').value = tache.projet || '';
  document.getElementById('popup-notes').value = tache.notes || '';
  
  remplirSelect('popup-statut', STATUTS.map(s => s.id), tache.statut);
  remplirSelect('popup-bureau', BUREAUX, tache.bureau ? tache.bureau.split(', ') : [], true);
  remplirSelect('popup-qui', RESPONSABLES, Array.isArray(tache.str_qui) ? tache.str_qui : (tache.str_qui ? tache.str_qui.split(', ') : []), true);
  remplirSelect('popup-urgence', URGENCES, tache.urgence);
  remplirSelect('popup-impact', IMPACTS, tache.impact);
  
  if (tache.date_echeance) {
    document.getElementById('popup-date-echeance').value = typeof tache.date_echeance === 'string' ? tache.date_echeance.split('T')[0] : tache.date_echeance.toISOString().split('T')[0];
  } else {
    document.getElementById('popup-date-echeance').value = '';
  }
  
  remplirSelect('popup-strategie', strategies.map(s => s.id), tache.strategie_id);
  document.getElementById('popup-action').value = tache.strategie_action || '';
  
  const priorite = calculerPriorite(tache.impact, tache.urgence);
  document.getElementById('popup-priorite').textContent = priorite;
  document.getElementById('popup-priorite').style.color = getCouleurPriorite(priorite);
  
  popup.classList.add('visible');
}

function remplirSelect(id, options, valeur, multiple = false) {
  const select = document.getElementById(id);
  select.innerHTML = '';
  select.multiple = multiple;
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    if (multiple && Array.isArray(valeur)) {
      opt.selected = valeur.includes(option);
    } else {
      opt.selected = option === valeur;
    }
    select.appendChild(opt);
  });
}

function fermerPopup() {
  document.getElementById('popup-tache').classList.remove('visible');
}

async function sauvegarderTache() {
  const tache = {
    titre: document.getElementById('popup-titre').value,
    description: document.getElementById('popup-description').value,
    statut: document.getElementById('popup-statut').value,
    bureau: Array.from(document.getElementById('popup-bureau').selectedOptions).map(opt => opt.value).join(', '),
    qui: Array.from(document.getElementById('popup-qui').selectedOptions).map(opt => opt.value).join(', '),
    urgence: document.getElementById('popup-urgence').value,
    impact: document.getElementById('popup-impact').value,
    date_echeance: document.getElementById('popup-date-echeance').value,
    projet: document.getElementById('popup-projet').value,
    strategie_id: document.getElementById('popup-strategie').value,
    strategie_action: document.getElementById('popup-action').value,
    notes: document.getElementById('popup-notes').value
  };

  try {
    if (currentTache.id) {
      await mettreAJourChamp(currentTache.id, tache);
      const index = currentRecords.findIndex(t => t.id === currentTache.id);
      if (index !== -1) {
        currentRecords[index] = { ...currentRecords[index], ...tache };
      }
    } else {
      const result = await grist.docApi.applyUserActions([['AddRecord', TABLE_ID, null, tache]]);
      if (result && result.rowIds && result.rowIds.length > 0) {
        tache.id = result.rowIds[0];
        currentRecords.push(tache);
      }
    }
    fermerPopup();
    afficherKanban(currentRecords);
  } catch (erreur) {
    console.error('Erreur lors de la sauvegarde:', erreur);
    alert(`Erreur lors de la sauvegarde: ${erreur.message}`);
  }
}

async function supprimerTache() {
  if (confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
    try {
      await mettreAJourChamp(currentTache.id, { statut: 'trash' });
      currentRecords = currentRecords.filter(t => t.id !== currentTache.id);
      fermerPopup();
      afficherKanban(currentRecords);
    } catch (erreur) {
      console.error('Erreur lors de la suppression:', erreur);
      alert(`Erreur lors de la suppression: ${erreur.message}`);
    }
  }
}

grist.ready({
  requiredAccess: 'full',
  columns: [
    'id', 'titre', 'description', 'statut',
    'projet', 'str_qui', 'date_echeance', 'notes',
    'bureau', 'urgence', 'impact', 'strategie_id',
    'strategie_action'
  ]
});

grist.onRecords(records => {
  currentRecords = Array.isArray(records) ? records : [];
  initialiserDonnees().then(() => {
    afficherKanban(currentRecords);
  });
});
