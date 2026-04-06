class StockManager {
    constructor() {
        this.dbName = 'BambinerieDB';
        this.dbVersion = 1;
        this.db = null;
        this.initDB();
        this.initEventListeners();
    }

    // Initialisation de la base de données IndexedDB
    initDB() {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = (event) => {
            console.error('Erreur de base de données:', event.target.error);
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('Base de données connectée');
            this.displayArticles();
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Création du store pour les articles
            if (!db.objectStoreNames.contains('articles')) {
                const store = db.createObjectStore('articles', { keyPath: 'id', autoIncrement: true });
                store.createIndex('nom', 'nom', { unique: false });
                store.createIndex('categorie', 'categorie', { unique: false });
                store.createIndex('prix', 'prix', { unique: false });
            }
        };
    }

    // Initialisation des événements
    initEventListeners() {
        document.getElementById('articleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addArticle();
        });

        document.getElementById('search').addEventListener('input', () => {
            this.displayArticles();
        });

        document.getElementById('filterCategory').addEventListener('change', () => {
            this.displayArticles();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateArticle();
        });

        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('editModal').style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('editModal')) {
                document.getElementById('editModal').style.display = 'none';
            }
        });

        document.getElementById('image').addEventListener('change', (e) => {
            this.previewImage(e);
        });
    }

    // Prévisualisation de l'image
    previewImage(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Aperçu">`;
            };
            reader.readAsDataURL(file);
        }
    }

    // Ajouter un article
    async addArticle() {
        const nom = document.getElementById('nom').value;
        const categorie = document.getElementById('categorie').value;
        const prix = parseFloat(document.getElementById('prix').value);
        const quantite = parseInt(document.getElementById('quantite').value);
        const description = document.getElementById('description').value;
        
        // Gestion de l'image
        let imageData = null;
        const imageFile = document.getElementById('image').files[0];
        
        if (imageFile) {
            imageData = await this.fileToBase64(imageFile);
        }

        const article = {
            nom,
            categorie,
            prix,
            quantite,
            description,
            image: imageData,
            dateAjout: new Date().toISOString()
        };

        const transaction = this.db.transaction(['articles'], 'readwrite');
        const store = transaction.objectStore('articles');
        const request = store.add(article);

        request.onsuccess = () => {
            alert('Article ajouté avec succès !');
            document.getElementById('articleForm').reset();
            document.getElementById('imagePreview').innerHTML = '';
            this.displayArticles();
        };

        request.onerror = () => {
            alert('Erreur lors de l\'ajout de l\'article');
        };
    }

    // Convertir un fichier en base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Afficher tous les articles
    displayArticles() {
        const searchTerm = document.getElementById('search').value.toLowerCase();
        const filterCategory = document.getElementById('filterCategory').value;
        
        const transaction = this.db.transaction(['articles'], 'readonly');
        const store = transaction.objectStore('articles');
        const request = store.getAll();

        request.onsuccess = () => {
            let articles = request.result;
            
            // Filtrage par recherche
            if (searchTerm) {
                articles = articles.filter(article => 
                    article.nom.toLowerCase().includes(searchTerm) ||
                    (article.description && article.description.toLowerCase().includes(searchTerm))
                );
            }
            
            // Filtrage par catégorie
            if (filterCategory !== 'all') {
                articles = articles.filter(article => article.categorie === filterCategory);
            }
            
            this.renderArticles(articles);
        };
    }

    // Rendu des articles dans le DOM
    renderArticles(articles) {
        const container = document.getElementById('articlesList');
        
        if (articles.length === 0) {
            container.innerHTML = '<p class="no-articles">Aucun article trouvé</p>';
            return;
        }

        container.innerHTML = articles.map(article => `
            <div class="article-card" data-id="${article.id}">
                ${article.image ? 
                    `<img src="${article.image}" alt="${article.nom}" class="article-image">` : 
                    `<div class="article-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                        <span>📷 Pas d'image</span>
                    </div>`
                }
                <div class="article-info">
                    <h3>${article.nom}</h3>
                    <p><strong>Catégorie:</strong> ${article.categorie}</p>
                    <p class="article-price">${article.prix.toFixed(2)} €</p>
                    <p><span class="article-quantity">Stock: ${article.quantite}</span></p>
                    ${article.description ? `<p>${article.description.substring(0, 100)}...</p>` : ''}
                    <p><small>Ajouté le: ${new Date(article.dateAjout).toLocaleDateString()}</small></p>
                </div>
                <div class="article-actions">
                    <button onclick="stockManager.openEditModal(${article.id})" class="btn-edit">Modifier</button>
                    <button onclick="stockManager.deleteArticle(${article.id})" class="btn-delete">Supprimer</button>
                </div>
            </div>
        `).join('');
    }

    // Ouvrir le modal de modification
    openEditModal(id) {
        const transaction = this.db.transaction(['articles'], 'readonly');
        const store = transaction.objectStore('articles');
        const request = store.get(id);

        request.onsuccess = () => {
            const article = request.result;
            
            document.getElementById('editId').value = article.id;
            document.getElementById('editNom').value = article.nom;
            document.getElementById('editCategorie').value = article.categorie;
            document.getElementById('editPrix').value = article.prix;
            document.getElementById('editQuantite').value = article.quantite;
            document.getElementById('editDescription').value = article.description || '';
            
            document.getElementById('editModal').style.display = 'block';
        };
    }

    // Mettre à jour un article
    updateArticle() {
        const id = parseInt(document.getElementById('editId').value);
        const nom = document.getElementById('editNom').value;
        const categorie = document.getElementById('editCategorie').value;
        const prix = parseFloat(document.getElementById('editPrix').value);
        const quantite = parseInt(document.getElementById('editQuantite').value);
        const description = document.getElementById('editDescription').value;

        const transaction = this.db.transaction(['articles'], 'readwrite');
        const store = transaction.objectStore('articles');
        
        // Récupérer l'article existant pour conserver l'image
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
            const article = getRequest.result;
            article.nom = nom;
            article.categorie = categorie;
            article.prix = prix;
            article.quantite = quantite;
            article.description = description;

            const updateRequest = store.put(article);
            
            updateRequest.onsuccess = () => {
                alert('Article mis à jour avec succès !');
                document.getElementById('editModal').style.display = 'none';
                this.displayArticles();
            };
        };
    }

    // Supprimer un article
    deleteArticle(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
            const transaction = this.db.transaction(['articles'], 'readwrite');
            const store = transaction.objectStore('articles');
            const request = store.delete(id);

            request.onsuccess = () => {
                alert('Article supprimé !');
                this.displayArticles();
            };
        }
    }

    // Mettre à jour la quantité
    updateQuantity(id, newQuantity) {
        const transaction = this.db.transaction(['articles'], 'readwrite');
        const store = transaction.objectStore('articles');
        
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
            const article = getRequest.result;
            article.quantite = newQuantity;
            
            const updateRequest = store.put(article);
            
            updateRequest.onsuccess = () => {
                this.displayArticles();
            };
        };
    }
}

// Initialisation de l'application
const stockManager = new StockManager();