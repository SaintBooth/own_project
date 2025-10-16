/**
 * ProjectCard Component
 * Card component for displaying project in list/grid view
 */

import routerService from '../services/routerService.js';

class ProjectCard {
  /**
   * Create project card element
   * @param {Object} project - Project data
   * @returns {HTMLElement}
   */
  render(project) {
    const card = document.createElement('article');
    card.className = 'project-card bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer';
    card.setAttribute('data-project-id', project.id);

    // Calculate total reactions
    const totalReactions = Object.values(project.reactionCounts || {}).reduce((sum, count) => sum + count, 0);

    card.innerHTML = `
      <!-- Project Thumbnail -->
      <div class="relative overflow-hidden h-48 bg-gray-200 dark:bg-gray-700">
        <img
          src="${project.thumbnail}"
          alt="${project.title}"
          class="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          loading="lazy"
          onerror="this.src='https://placehold.co/800x600/gray/white?text=No+Image'"
        />
        ${project.featured ? `
          <div class="absolute top-2 right-2 bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Featured
          </div>
        ` : ''}
        ${project.category ? `
          <div class="absolute top-2 left-2 bg-gray-900/70 text-white px-3 py-1 rounded-full text-xs font-semibold capitalize">
            ${project.category}
          </div>
        ` : ''}
      </div>

      <!-- Project Content -->
      <div class="p-6">
        <!-- Title -->
        <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100 line-clamp-1">
          ${project.title}
        </h3>

        <!-- Description -->
        <p class="project-description text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          ${project.description}
        </p>

        <!-- Technologies -->
        <div class="flex flex-wrap gap-2 mb-4">
          ${project.technologies.slice(0, 4).map(tech => `
            <span class="tech-tag px-3 py-1 bg-primary-light/10 dark:bg-primary-light/20 text-primary-light dark:text-primary-light text-xs rounded-full font-medium">
              ${tech}
            </span>
          `).join('')}
          ${project.technologies.length > 4 ? `
            <span class="tech-tag px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium">
              +${project.technologies.length - 4}
            </span>
          ` : ''}
        </div>

        <!-- Footer: Reactions & CTA -->
        <div class="flex items-center justify-between">
          <!-- Reactions Preview -->
          <div class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            ${totalReactions > 0 ? `
              <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
              </svg>
              <span>${totalReactions}</span>
            ` : ''}
          </div>

          <!-- View Details Link -->
          <span class="text-primary-500 dark:text-primary-400 font-semibold text-sm hover:underline flex items-center">
            View Details
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>

        <!-- Completed Date -->
        ${project.completedDate ? `
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span class="text-xs text-gray-500 dark:text-gray-400">
              Completed: ${new Date(project.completedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        ` : ''}
      </div>
    `;

    // Add click handler to navigate to detail page
    card.addEventListener('click', (e) => {
      e.preventDefault();
      routerService.navigate(`/projects/${project.slug}`);
    });

    return card;
  }
}

export default new ProjectCard();
