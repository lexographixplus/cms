 document.addEventListener('DOMContentLoaded', () => {


    // --- TOKEN VALIDATION FOR ESSA ---
    const ACCESS_TOKEN = "essa2025"; // Token specific to Essa
    const urlParams = new URLSearchParams(window.location.search);
    const providedToken = urlParams.get('token');

    // --- DEBUGGING LINES ---
    console.log("Expected Token:", ACCESS_TOKEN);
    console.log("Token from URL:", providedToken);
    console.log("Are tokens identical?", providedToken === ACCESS_TOKEN);
    // --- END DEBUGGING ---

    if (providedToken !== ACCESS_TOKEN) {
        console.error("Token validation FAILED. Stopping script."); // Add error log
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
                <h2 style="color: #dc3545;">Unauthorized Access</h2>
                <p>This CMS is restricted to Essa only. Please contact LexoGraphix Plus if you believe this is an error.</p>
                <p><small>Provided token: ${providedToken === null ? '<i>Missing</i>' : providedToken}</small></p>
            </div>`;
        return; // Stop script execution completely if token is invalid
    }


    // --- Configuration ---
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbiy7qmVBHzn6xtYMVQ1GayuQINup0cWvduhN8vJn9n_NFQEo_Q3SGEWz6I_rwy3-3eg/exec";

    // --- Global State ---
    const MOCK_USER = { name: "Lexographix Admin" };
    let posts = [];
    let media = [];
    let currentEditingId = null;
    let isLoading = false;
    let quill = null; // Variable to hold the Quill instance

    // --- DOM Element Selectors ---
    const navToggle = document.getElementById('navToggle');
    const mainNavMenu = document.getElementById('mainNavMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const userNameSpan = document.getElementById('userName');
    const totalPostsStat = document.getElementById('totalPostsStat');
    const draftPostsStat = document.getElementById('draftPostsStat');
    const publishedPostsStat = document.getElementById('publishedPostsStat');
    const postTableBody = document.getElementById('postTableBody');
    const statusFilter = document.getElementById('statusFilter');
    const editPostTitle = document.getElementById('editPostTitle');
    const postForm = document.getElementById('postForm');
    const postIdInput = document.getElementById('postId');
    const postTitleInput = document.getElementById('postTitle');
    // REMOVED: const postContentInput = document.getElementById('postContent');
    const postStatusSelect = document.getElementById('postStatus');
    const postImageInput = document.getElementById('postImage');
    const postImagePreview = document.getElementById('postImagePreview');
    const saveDraftButton = document.getElementById('saveDraftButton');
    const publishButton = document.getElementById('publishButton');
    const mediaGrid = document.getElementById('mediaGrid');
    const uploadNewImageInput = document.getElementById('uploadNewImageInput');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalClose = document.getElementById('modalClose');
    const noPostsMessage = document.getElementById('noPostsMessage');
    const noMediaMessage = document.getElementById('noMediaMessage');
    const quickActionButtons = document.querySelectorAll('.quick-action-btn');
    const logoutButton = document.getElementById('logoutButton');

    // --- Utility Functions ---
    const formatDate = (dateString) => {
         // ... (formatDate remains the same) ...
         if (!dateString) return 'N/A';
         try {
             const options = { year: 'numeric', month: 'short', day: 'numeric' };
             const date = new Date(dateString); // Assumes ISO string from Apps Script
             if (isNaN(date)) return 'Invalid Date';
             return date.toLocaleDateString(undefined, options);
         } catch (e) {
             return dateString;
         }
    };

    const setLoading = (loading) => {
         // ... (setLoading remains the same) ...
          isLoading = loading;
         console.log("Loading:", isLoading);
         const buttons = document.querySelectorAll('button, input[type="submit"], input[type="file"], .nav-link, .quick-action-btn');
         buttons.forEach(btn => {
              if (btn.id !== 'navToggle') {
                  if (loading) {
                       btn.setAttribute('disabled', 'disabled');
                       if(btn.tagName === 'A') btn.style.pointerEvents = 'none';
                   } else {
                       btn.removeAttribute('disabled');
                        if(btn.tagName === 'A') btn.style.pointerEvents = '';
                   }
              }
         });
    };

    // --- API Call Function ---
    async function callAppsScript(action, method = 'GET', payload = null) {
        // ... (callAppsScript remains the same) ...
        if (!SCRIPT_URL || SCRIPT_URL === "YOUR_WEB_APP_URL_HERE") {
             alert("Error: Apps Script URL is not configured correctly in script.js");
             throw new Error("Apps Script URL not configured.");
         }
         setLoading(true);
         let url = SCRIPT_URL;
         const options = {
             method: method,
             redirect: 'follow',
         };
         if (method === 'GET') {
             url += `${url.includes('?') ? '&' : '?'}action=${encodeURIComponent(action)}`;
         } else if (method === 'POST') {
             options.body = JSON.stringify({ action, payload });
              options.headers = {
                  'Content-Type': 'text/plain;charset=utf-8',
              };
         }
         try {
             console.log(`Calling ${method} ${url} with action: ${action}${payload ? ' and payload' : ''}`);
             const response = await fetch(url, options);
              if (!response.ok) {
                   let errorBody = "No error details available.";
                   try {
                       errorBody = await response.text();
                       console.error(`Raw error response (Status ${response.status}):`, errorBody);
                        if (errorBody.trim().startsWith('{')) {
                             const errorJson = JSON.parse(errorBody);
                             errorBody = errorJson.error || errorJson.message || JSON.stringify(errorJson);
                       } else if (errorBody.includes('<title>Error</title>') || response.status === 500 || response.status === 502) {
                             errorBody = "Google Apps Script execution error. Check script editor logs (Extensions > Apps Script > Executions). Possible reasons: Script error, permissions issue, timeout, or sheet structure mismatch.";
                       }
                   } catch (parseError) { console.warn("Could not parse error response body:", parseError); }
                  throw new Error(`Network or Server Error! Status: ${response.status}. Message: ${errorBody}`);
              }
             const result = await response.json();
             console.log("Received result:", result);
             if (result && result.success === false) {
                 throw new Error(result.error || "An unknown error occurred in Apps Script.");
             }
             if (result && result.success === true) {
                 return result.data;
             }
             console.warn("Received unexpected response structure:", result);
             throw new Error("Received unexpected response structure from server.");
         } catch (error) {
             console.error("Error calling Apps Script:", error);
              alert(`An error occurred: ${error.message}`);
             throw error;
         } finally {
             setLoading(false);
         }
    }

    // --- Data Fetching Functions ---
    async function fetchPosts() {
        // ... (fetchPosts remains the same) ...
         noPostsMessage.textContent = "Loading posts...";
         noPostsMessage.style.display = 'block';
         postTableBody.style.display = 'none';
         try {
             const fetchedPosts = await callAppsScript('getPosts', 'GET');
             if (!Array.isArray(fetchedPosts)) {
                  console.warn("Fetched posts data is not an array:", fetchedPosts);
                  throw new Error("Received invalid post data format.");
             }
              posts = fetchedPosts.map(p => ({
                  id: p.ID,
                  title: p.Title || '',
                  content: p.Content || '',
                  status: p.Status || 'Draft',
                  date: p.DateModified || p.DateCreated,
                  image: p.FeaturedImageUrl || null
              }));
             renderPosts(statusFilter.value);
             renderDashboard();
         } catch (error) {
             console.error("Failed to fetch posts:", error);
             noPostsMessage.textContent = "Failed to load posts. Please check console or try again later.";
             noPostsMessage.style.display = 'block';
             postTableBody.innerHTML = '';
             postTableBody.style.display = 'none';
             posts = [];
             renderDashboard();
         }
    }

    async function fetchMedia() {
        // ... (fetchMedia remains the same) ...
          noMediaMessage.textContent = "Loading media...";
          noMediaMessage.style.display = 'block';
          mediaGrid.innerHTML = '';
         try {
             const fetchedMedia = await callAppsScript('getMedia', 'GET');
             if (!Array.isArray(fetchedMedia)) {
                 console.warn("Fetched media data is not an array:", fetchedMedia);
                 throw new Error("Received invalid media data format.");
             }
              media = fetchedMedia.map(m => ({
                  id: m.ID,
                  url: m.Url,
                  alt: m.AltText || ''
              }));
             renderMedia();
         } catch (error) {
             console.error("Failed to fetch media:", error);
              noMediaMessage.textContent = "Failed to load media. Please check console or try again later.";
              noMediaMessage.style.display = 'block';
              mediaGrid.innerHTML = '';
              media = [];
         }
    }

    // --- Rendering Functions ---
    const renderDashboard = () => {
        // ... (renderDashboard remains the same) ...
         const validPosts = Array.isArray(posts) ? posts : [];
         userNameSpan.textContent = MOCK_USER.name;
         const draftCount = validPosts.filter(post => post.status === 'Draft').length;
         const publishedCount = validPosts.filter(post => post.status === 'Published').length;
         totalPostsStat.textContent = validPosts.length;
         draftPostsStat.textContent = draftCount;
         publishedPostsStat.textContent = publishedCount;
    };

    const renderPosts = (filter = 'all') => {
        // ... (renderPosts remains the same) ...
         postTableBody.innerHTML = '';
         const validPosts = Array.isArray(posts) ? posts : [];
         const filteredPosts = validPosts.filter(post => filter === 'all' || post.status === filter);

         if (filteredPosts.length === 0) {
              noPostsMessage.textContent = filter === 'all' ? "No posts found." : `No ${filter.toLowerCase()} posts found.`;
              noPostsMessage.style.display = 'block';
              postTableBody.style.display = 'none';
         } else {
              noPostsMessage.style.display = 'none';
              postTableBody.style.display = '';

             filteredPosts.sort((a, b) => {
                  const dateA = a.date ? new Date(a.date) : null;
                  const dateB = b.date ? new Date(b.date) : null;
                  if (dateA && dateB) return dateB - dateA;
                  if (dateB) return 1;
                  if (dateA) return -1;
                  return 0;
             });

             filteredPosts.forEach(post => {
                  const row = document.createElement('tr');
                  row.innerHTML = `
                      <td>${post.title || '(No Title)'}</td>
                      <td><span class="post-status post-status-${(post.status || 'draft').toLowerCase()}">${post.status || 'N/A'}</span></td>
                      <td>${formatDate(post.date)}</td>
                      <td class="action-buttons">
                          <button class="btn action-btn-edit" data-id="${post.id}">Edit</button>
                          <button class="btn action-btn-delete" data-id="${post.id}">Delete</button>
                      </td>
                  `;
                  postTableBody.appendChild(row);
             });
         }
    };

    const renderMedia = () => {
        // ... (renderMedia remains the same) ...
         mediaGrid.innerHTML = '';
         const validMedia = Array.isArray(media) ? media : [];

          if (validMedia.length === 0) {
               noMediaMessage.textContent = "No media items found. Upload some!";
               noMediaMessage.style.display = 'block';
         } else {
               noMediaMessage.style.display = 'none';
               validMedia.forEach(item => {
                  const div = document.createElement('div');
                  div.classList.add('media-item');
                  div.innerHTML = `<img src="${item.url}" alt="${item.alt || ''}" data-id="${item.id}" loading="lazy">`;
                  mediaGrid.appendChild(div);
               });
         }
    };

    // --- UI Interaction Functions ---
    const setActiveSection = (targetId) => {
        // ... (setActiveSection remains the same) ...
         contentSections.forEach(section => {
             section.classList.toggle('active', section.id === targetId);
         });
         navLinks.forEach(link => {
             link.classList.toggle('active', link.dataset.target === targetId);
         });
         if (mainNavMenu.classList.contains('active')) {
             mainNavMenu.classList.remove('active');
             navToggle.classList.remove('open');
             navToggle.setAttribute('aria-expanded', 'false');
         }
    };

    // REMOVED Trix Editor Integration Helpers

    const showEditForm = (postId = null) => {
        // Reset native form elements first
        postForm.reset();

        postImagePreview.style.display = 'none';
        postImagePreview.src = '#';
        currentEditingId = postId || null;

        // Clear Quill editor initially
        if (quill) {
            quill.setContents([]); // Clear content efficiently
        } else {
            console.error("Quill editor not initialized!"); // Should not happen if initialized correctly
        }

        if (postId) { // --- Editing an existing post ---
            const post = posts.find(p => p.id == postId);
            if (post) {
                editPostTitle.textContent = 'Edit Post';
                publishButton.textContent = 'Update Post';
                postIdInput.value = post.id;
                postTitleInput.value = post.title || '';
                // Set Quill content using innerHTML (safer if content is trusted HTML)
                if (quill) {
                   quill.root.innerHTML = post.content || '';
                }
                postStatusSelect.value = post.status || 'Draft';
                if (post.image) {
                    postImagePreview.src = post.image;
                    postImagePreview.style.display = 'block';
                }
            } else {
                 console.error(`Post with ID ${postId} not found locally.`);
                 alert(`Error: Could not find post with ID ${postId} to edit.`);
                 setActiveSection('posts-section');
                 return;
            }
        } else { // --- Creating a new post ---
            // Form already reset, Quill already cleared
            editPostTitle.textContent = 'Create New Post';
            publishButton.textContent = 'Publish';
            currentEditingId = null;
        }
        setActiveSection('edit-post-section');
    };

    // --- Event Handlers ---
    // ... (Navigation Toggle, Centralized Event Listener, Status Filter remain largely the same) ...
     navToggle.addEventListener('click', () => {
         const isActive = mainNavMenu.classList.toggle('active');
         navToggle.classList.toggle('open');
         navToggle.setAttribute('aria-expanded', isActive);
    });

    document.body.addEventListener('click', (e) => {
         const navAction = e.target.closest('.nav-link:not([disabled]), .quick-action-btn:not([disabled])');
         if (navAction && navAction.dataset.target) {
             e.preventDefault();
             const targetId = navAction.dataset.target;
             if (targetId === 'edit-post-section' && navAction.dataset.mode === 'create') {
                 showEditForm(null);
             } else if (targetId !== 'edit-post-section') {
                 setActiveSection(targetId);
             }
             return;
         }

         const tableButton = e.target.closest('.action-btn-edit:not([disabled]), .action-btn-delete:not([disabled])');
         if (tableButton && postTableBody.contains(tableButton)) {
             const postId = tableButton.dataset.id;
             if (!postId) { console.error("Action button missing data-id."); return; }
             if (tableButton.classList.contains('action-btn-edit')) {
                 showEditForm(postId);
             } else if (tableButton.classList.contains('action-btn-delete')) {
                 handleDeletePost(postId);
             }
             return;
         }

         const mediaItem = e.target.closest('.media-item img');
         if (mediaItem && mediaGrid.contains(mediaItem)) {
             modalImage.src = mediaItem.src;
             imageModal.style.display = "block";
             return;
         }

          if (e.target === modalClose || e.target === imageModal) {
               imageModal.style.display = "none";
               return;
          }

          if (e.target === logoutButton || logoutButton.contains(e.target)) {
             e.preventDefault();
              if(logoutButton.hasAttribute('disabled')) return;
              window.location.replace('Login/login.html');
          }

           if (e.target === saveDraftButton || saveDraftButton.contains(e.target)) {
                if(saveDraftButton.hasAttribute('disabled')) return;
                handlePostSave('Draft');
                return;
           }
    });

    statusFilter.addEventListener('change', (e) => {
         renderPosts(e.target.value);
    });

    async function handleDeletePost(postId) {
        // ... (handleDeletePost remains the same) ...
        if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
                try {
                    await callAppsScript('deletePost', 'POST', { id: postId });
                    posts = posts.filter(post => post.id != postId);
                    renderPosts(statusFilter.value);
                    renderDashboard();
                    alert('Post deleted successfully.');
                } catch (error) {
                     console.error("Failed to delete post:", error);
                }
           }
    }

    // Function to handle form submission (Save/Publish) - UPDATED FOR QUILL
    const handlePostSave = async (status) => {
         const title = postTitleInput.value.trim();
         // Get content from Quill editor as HTML
         const content = quill ? quill.root.innerHTML : ''; // Get HTML content
         let imageSrc = null;

         if (postImagePreview.style.display !== 'none' && postImagePreview.src !== '#' && postImagePreview.src !== window.location.href) {
             imageSrc = postImagePreview.src;
         } else if (currentEditingId) {
             const existingPost = posts.find(p => p.id == currentEditingId);
             imageSrc = existingPost ? existingPost.image : null;
         }

         // Check for empty content from Quill (might be <p><br></p>)
         const isEmptyContent = !quill || quill.getLength() <= 1; // Quill's getLength includes the newline

         if (!title) {
             alert('Please fill in the Title field.');
             return;
         }
         if (isEmptyContent && !confirm("Content is empty. Save anyway?")) {
            return;
         }

         const postData = {
             id: currentEditingId,
             title: title,
             content: content, // Content from Quill
             status: status,
             image: imageSrc
         };

         const action = currentEditingId ? 'updatePost' : 'createPost';

         try {
             const savedPostData = await callAppsScript(action, 'POST', postData);
              const updatedOrNewPost = {
                  id: savedPostData.ID || (action === 'createPost' ? Date.now() : currentEditingId),
                  title: savedPostData.Title !== undefined ? savedPostData.Title : title,
                  content: savedPostData.Content !== undefined ? savedPostData.Content : content, // Store HTML
                  status: savedPostData.Status !== undefined ? savedPostData.Status : status,
                  date: savedPostData.DateModified || savedPostData.DateCreated || new Date().toISOString(),
                  image: savedPostData.FeaturedImageUrl !== undefined ? savedPostData.FeaturedImageUrl : imageSrc
              };

             if (action === 'updatePost') {
                  const index = posts.findIndex(p => p.id == currentEditingId);
                  if (index > -1) posts[index] = updatedOrNewPost;
                  else { console.warn("Updated post not found, adding."); posts.push(updatedOrNewPost); }
                  alert('Post updated successfully!');
             } else {
                  posts.push(updatedOrNewPost);
                  alert('Post created successfully!');
             }

             // Common actions after save/update
             renderPosts(statusFilter.value);
             renderDashboard();
             // Reset form state and navigate away from editor
             postForm.reset();
             if (quill) quill.setContents([]); // Clear Quill editor
             postImagePreview.style.display = 'none';
             postImagePreview.src = '#';
             currentEditingId = null;
             setActiveSection('posts-section');

         } catch (error) {
             console.error(`Failed to ${action}:`, error);
         }
    };

    // Publish/Update Button (Form Submit Listener)
    postForm.addEventListener('submit', (e) => {
        // ... (submit handler remains the same) ...
         e.preventDefault();
         if (publishButton.hasAttribute('disabled')) return;
         handlePostSave(postStatusSelect.value || 'Published');
    });

    // --- Image Handling Helpers ---
    function handleImageFile(file, callback) {
        // ... (handleImageFile remains the same) ...
         if (file && file.type.startsWith('image/')) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Image file is too large (Max 2MB). Please choose a smaller file.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                resizeImage(e.target.result, 1000, (resizedDataUrl) => {
                    callback(resizedDataUrl);
                });
            };
            reader.onerror = (e) => { console.error("FileReader error:", e); alert("Error reading file."); };
            reader.readAsDataURL(file);
        } else if (file) {
            alert("Please select a valid image file (e.g., JPG, PNG, GIF).");
        }
    }

    function resizeImage(dataUrl, maxWidth, callback) {
        // ... (resizeImage remains the same) ...
        const img = new Image();
        img.onload = () => {
            let width = img.width; let height = img.height;
            if (width > maxWidth) { height = Math.round((maxWidth / width) * height); width = maxWidth; }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
             const outputFormat = dataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
             const resizedDataUrl = canvas.toDataURL(outputFormat, 0.85);
             callback(resizedDataUrl);
         };
         img.onerror = () => { console.error("Error loading image for resizing."); callback(dataUrl); };
         img.src = dataUrl;
    }

    // Post Featured Image Upload Preview
    postImageInput.addEventListener('change', (e) => {
        // ... (change handler remains the same) ...
         const file = e.target.files[0];
         handleImageFile(file, (dataUrl) => {
             postImagePreview.src = dataUrl;
             postImagePreview.style.display = 'block';
         });
         e.target.value = null;
    });

    // Media Library Upload Handling
    uploadNewImageInput.addEventListener('change', (e) => {
        // ... (change handler remains the same) ...
        const file = e.target.files[0];
          if (!file) return;
          handleImageFile(file, async (dataUrl) => {
             const mediaData = { url: dataUrl, altText: file.name || `Uploaded Image ${Date.now()}` };
             try {
                 const savedMediaData = await callAppsScript('uploadMedia', 'POST', mediaData);
                  const newMedia = {
                      id: savedMediaData.ID || Date.now(),
                      url: savedMediaData.Url || dataUrl,
                      alt: savedMediaData.AltText || mediaData.altText
                  };
                  media.push(newMedia);
                  renderMedia();
                  alert('Image reference saved to Media Library.');
             } catch (error) { console.error("Failed to upload media reference:", error); }
         });
          e.target.value = null;
    });

    // --- Initial Setup ---
    function initializeApp() {
        console.log("Initializing Lexoway CMS with Quill...");
        if (!SCRIPT_URL || SCRIPT_URL === "YOUR_WEB_APP_URL_HERE") {
             alert("CRITICAL ERROR: Google Apps Script URL is not configured in script.js.");
             setLoading(true);
             const contentArea = document.querySelector('.content-area');
             if(contentArea) contentArea.innerHTML = '<p style="color: red; padding: 20px;">Application configuration error. Cannot load CMS.</p>';
             return;
        }

        // Initialize Quill Editor
        try {
            quill = new Quill('#editor-container', {
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        ['link'], // Removed 'image', 'video' - add back if needed & handle uploads
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'script': 'sub'}, { 'script': 'super' }],
                        [{ 'indent': '-1'}, { 'indent': '+1' }],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'align': [] }],
                        ['blockquote', 'code-block'],
                        ['clean'] // remove formatting button
                    ]
                },
                placeholder: 'Compose your epic post...',
                theme: 'snow' // Specify theme (must match CSS include)
            });
            console.log("Quill editor initialized.");
        } catch (error) {
            console.error("Failed to initialize Quill:", error);
             alert("Error initializing the text editor. Please check the console.");
             // Optionally disable the editor section or show a message
        }


        userNameSpan.textContent = MOCK_USER.name;
        setActiveSection('dashboard-section');

        console.log("Fetching initial data (Posts and Media)...");
        Promise.all([fetchPosts(), fetchMedia()])
            .then(() => { console.log("Initial data fetch complete."); })
            .catch(error => { console.error("Error during initial data fetch:", error); });
    }

    // Run initialization
    initializeApp();

}); // End of DOMContentLoaded listener