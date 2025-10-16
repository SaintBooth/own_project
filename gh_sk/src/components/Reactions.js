/**
 * Reactions Component
 * Interactive reaction buttons with localStorage persistence
 */

import storageService from '../services/storageService.js';
import eventBus from '../services/eventBus.js';

class Reactions {
  constructor() {
    this.reactions = [
      { type: 'like', label: 'Like', icon: '👍', color: 'blue' },
      { type: 'love', label: 'Love', icon: '❤️', color: 'red' },
      { type: 'celebrate', label: 'Celebrate', icon: '🎉', color: 'yellow' }
    ];
  }

  /**
   * Render reactions component
   * @param {Object} project - Project data
   * @returns {HTMLElement}
   */
  render(project) {
    const container = document.createElement('div');
    container.className = 'reactions-container bg-gray-50 dark:bg-gray-800 rounded-lg p-6';
    container.setAttribute('data-project-id', project.id);

    // Get user's reactions from localStorage
    const userReactions = this.getUserReactions(project.id);

    // Get current counts
    const counts = this.getCurrentCounts(project);

    container.innerHTML = `
      <div class="mb-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          Show Your Support
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Let me know what you think about this project!
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        ${this.reactions.map(reaction => {
          const count = counts[reaction.type] || 0;
          const isActive = userReactions.includes(reaction.type);

          return `
            <button
              class="reaction-button ${isActive ? 'active' : ''} group relative px-6 py-3 rounded-lg border-2 transition-all duration-200 ${
                isActive
                  ? `border-${reaction.color}-500 bg-${reaction.color}-50 dark:bg-${reaction.color}-900/20`
                  : 'border-gray-300 dark:border-gray-600 hover:border-' + reaction.color + '-400 dark:hover:border-' + reaction.color + '-500 bg-white dark:bg-gray-700 hover:bg-' + reaction.color + '-50 dark:hover:bg-' + reaction.color + '-900/20'
              }"
              data-reaction="${reaction.type}"
              data-project-id="${project.id}"
              aria-label="${reaction.label} this project"
              aria-pressed="${isActive}"
            >
              <div class="flex items-center space-x-2">
                <span class="text-2xl transform transition-transform group-hover:scale-125">
                  ${reaction.icon}
                </span>
                <div class="text-left">
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ${reaction.label}
                  </div>
                  <div class="reaction-count text-xs text-gray-600 dark:text-gray-400">
                    ${count}
                  </div>
                </div>
              </div>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Total Count -->
      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          <span class="font-semibold">${Object.values(counts).reduce((sum, count) => sum + count, 0)}</span>
          ${Object.values(counts).reduce((sum, count) => sum + count, 0) === 1 ? 'person has' : 'people have'} reacted to this project
        </p>
      </div>
    `;

    this.attachEventListeners(container, project);

    return container;
  }

  /**
   * Get user's reactions for a project from localStorage
   * @param {string} projectId - Project ID
   * @returns {Array} Array of reaction types
   */
  getUserReactions(projectId) {
    const key = `reactions:${projectId}`;
    return storageService.get(key, []);
  }

  /**
   * Get current reaction counts for a project
   * @param {Object} project - Project data
   * @returns {Object} Reaction counts
   */
  getCurrentCounts(project) {
    // Get base counts from project data
    const baseCounts = { ...project.reactionCounts };

    // Get all user reactions from localStorage to calculate total
    const allReactions = storageService.get('reactions:all', {});
    const projectReactions = allReactions[project.id] || {};

    // Merge counts
    Object.keys(projectReactions).forEach(type => {
      baseCounts[type] = (baseCounts[type] || 0) + projectReactions[type];
    });

    return baseCounts;
  }

  /**
   * Toggle a reaction
   * @param {string} projectId - Project ID
   * @param {string} reactionType - Reaction type
   * @returns {boolean} True if added, false if removed
   */
  toggleReaction(projectId, reactionType) {
    // Get user's current reactions
    const userReactions = this.getUserReactions(projectId);
    const index = userReactions.indexOf(reactionType);

    let added = false;

    if (index > -1) {
      // Remove reaction
      userReactions.splice(index, 1);
      this.decrementCount(projectId, reactionType);
    } else {
      // Add reaction
      userReactions.push(reactionType);
      this.incrementCount(projectId, reactionType);
      added = true;
    }

    // Save user reactions
    storageService.set(`reactions:${projectId}`, userReactions);

    // Emit event for analytics/tracking
    eventBus.emit('reaction:toggled', {
      projectId,
      reactionType,
      added
    });

    return added;
  }

  /**
   * Increment reaction count
   * @param {string} projectId - Project ID
   * @param {string} reactionType - Reaction type
   */
  incrementCount(projectId, reactionType) {
    const allReactions = storageService.get('reactions:all', {});

    if (!allReactions[projectId]) {
      allReactions[projectId] = {};
    }

    allReactions[projectId][reactionType] = (allReactions[projectId][reactionType] || 0) + 1;

    storageService.set('reactions:all', allReactions);
  }

  /**
   * Decrement reaction count
   * @param {string} projectId - Project ID
   * @param {string} reactionType - Reaction type
   */
  decrementCount(projectId, reactionType) {
    const allReactions = storageService.get('reactions:all', {});

    if (allReactions[projectId] && allReactions[projectId][reactionType]) {
      allReactions[projectId][reactionType] = Math.max(0, allReactions[projectId][reactionType] - 1);
    }

    storageService.set('reactions:all', allReactions);
  }

  /**
   * Update reaction button UI
   * @param {HTMLElement} button - Reaction button element
   * @param {boolean} isActive - Whether reaction is active
   * @param {number} count - Current count
   */
  updateButtonUI(button, isActive, count) {
    const reactionType = button.getAttribute('data-reaction');
    const reaction = this.reactions.find(r => r.type === reactionType);

    if (!reaction) return;

    // Update active state
    button.setAttribute('aria-pressed', isActive);

    if (isActive) {
      button.className = `reaction-button active group relative px-6 py-3 rounded-lg border-2 transition-all duration-200 border-${reaction.color}-500 bg-${reaction.color}-50 dark:bg-${reaction.color}-900/20`;
      button.classList.add('active');
    } else {
      button.className = `reaction-button group relative px-6 py-3 rounded-lg border-2 transition-all duration-200 border-gray-300 dark:border-gray-600 hover:border-${reaction.color}-400 dark:hover:border-${reaction.color}-500 bg-white dark:bg-gray-700 hover:bg-${reaction.color}-50 dark:hover:bg-${reaction.color}-900/20`;
      button.classList.remove('active');
    }

    // Update count
    const countElement = button.querySelector('.reaction-count');
    if (countElement) {
      countElement.textContent = count;
    }

    // Add animation
    button.classList.add('scale-110');
    setTimeout(() => button.classList.remove('scale-110'), 200);
  }

  /**
   * Attach event listeners
   * @param {HTMLElement} container - Reactions container
   * @param {Object} project - Project data
   */
  attachEventListeners(container, project) {
    const buttons = container.querySelectorAll('.reaction-button');

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const reactionType = button.getAttribute('data-reaction');
        const projectId = button.getAttribute('data-project-id');

        // Toggle reaction
        const added = this.toggleReaction(projectId, reactionType);

        // Get updated counts
        const counts = this.getCurrentCounts(project);
        const count = counts[reactionType] || 0;

        // Update UI
        this.updateButtonUI(button, added, count);

        // Update total count
        const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);
        const totalElement = container.querySelector('.mt-4 p');
        if (totalElement) {
          totalElement.innerHTML = `
            <span class="font-semibold">${totalCount}</span>
            ${totalCount === 1 ? 'person has' : 'people have'} reacted to this project
          `;
        }
      });
    });
  }
}

export default new Reactions();
