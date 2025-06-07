<script>
    import { onMount } from 'svelte';
    import { api } from '../api';

	let htmlContainer;
	let activeTab = 'home'; // Default active tab
	let hoveredIndicator = null;

	let emails = [];
	let selectedEmail = null;

	let showDetails = true;

	let showRawModal = false;
	let rawEmailContent = '';


	function parseEmailDate(dateStr) {
		return new Date(dateStr);
	}

	onMount(async () => {
		try {
			const fetchedEmails = await api.getEmails();
			
			// Sort emails by date (newest first)
			emails = fetchedEmails.sort((a, b) => {
				const dateA = parseEmailDate(a.metadatas.Date);
				const dateB = parseEmailDate(b.metadatas.Date);
				return dateB - dateA;
			});
			
			selectedEmail = emails[0]; // Set default selected email after loading
		} catch (error) {
			console.error('Failed to fetch emails:', error);
		}
	});

	$: subjectLine = selectedEmail?.subject?.toLowerCase() || '';

	// Basic AI NLP tag inference from analysis string
	$: aiAnalysis =
		selectedEmail?.metadatas?.aiAnalysis?.toLowerCase() || 'AI insights not available.';

	// Basic AI NLP tag inference from analysis string
	$: aiSenderAnalysis =
		selectedEmail?.metadatas?.aiSenderAnalysis?.toLowerCase() || 'AI insights not available.';

	// Basic AI NLP tag inference from analysis string
	$: aiSecurityAnalysis =
		selectedEmail?.metadatas?.aiSecurityAnalysis?.toLowerCase() || 'AI insights not available.';

	// Tone Detection
	$: tone =
		aiAnalysis.includes('urgent') || aiAnalysis.includes('immediately')
			? 'Urgent'
			: aiAnalysis.includes('friendly')
				? 'Friendly'
				: aiAnalysis.includes('neutral')
					? 'Neutral'
					: 'Neutral';

	$: toneColor =
		tone === 'Urgent' ? 'bg-yellow-600' : tone === 'Friendly' ? 'bg-green-600' : 'bg-blue-600';
	$: toneIcon = tone === 'Urgent' ? '⚠️' : tone === 'Friendly' ? '😊' : '💬';

	// Emotion Detection
	$: emotion =
		aiAnalysis.includes('fear') || aiAnalysis.includes('red flags')
			? 'Fear'
			: aiAnalysis.includes('curious')
				? 'Curiosity'
				: aiAnalysis.includes('trust')
					? 'Trust'
					: 'Unclear';

	$: emotionColor =
		emotion === 'Fear' ? 'bg-red-600' : emotion === 'Curiosity' ? 'bg-pink-600' : 'bg-gray-600';
	$: emotionIcon = emotion === 'Fear' ? '😨' : emotion === 'Curiosity' ? '🤔' : '🧠';

	// Action Inference
	$: action =
		aiAnalysis.includes('confirm') || aiAnalysis.includes('click')
			? 'Confirm or Click'
			: aiAnalysis.includes('review')
				? 'Review Info'
				: aiAnalysis.includes('no action')
					? 'No Action'
					: 'Unclear';

	$: actionColor =
		action.includes('Confirm') || action.includes('Click') ? 'bg-purple-600' : 'bg-gray-600';
	$: actionIcon = action.includes('Confirm') || action.includes('Click') ? '📩' : '📝';

	// Enhanced content analysis for visual indicators
	$: bodyIndicators = analyzeEmailContent(selectedEmail?.metadatas?.htmlBody || '', false);
	$: subjectIndicators = analyzeEmailContent(selectedEmail?.subject || '', true);
	$: indicators = [...bodyIndicators];

	function analyzeEmailContent(htmlContent, isSubject = false) {
		if (!htmlContent) return [];

		const indicators = [];
		let textContent = '';

		// Create a temporary element to parse HTML
		if (typeof document !== 'undefined') {
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = htmlContent;
			textContent = tempDiv.textContent || tempDiv.innerText || '';
		} else {
			textContent = htmlContent
				.replace(/<[^>]*>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		}

		// Improved URL detection regex
		const urlRegex =
			/(?:<a[^>]*?href=["'](https?:\/\/[^\s<>"]+)["'][^>]*>.*?<\/a>|(?:https?:\/\/[^\s<>"]+))/gi;
		let match;
		const processedUrls = new Set(); // Track processed URLs to avoid duplicates

		while ((match = urlRegex.exec(htmlContent)) !== null) {
			const url = match[1] || match[0]; // Get the URL from either the href or direct match

			// Skip if we've already processed this URL
			if (processedUrls.has(url)) continue;
			processedUrls.add(url);

			// Add URL indicator
			indicators.push({
				type: 'url',
				category: 'Suspicious URL',
				phrase: url,
				color: 'bg-orange-500',
				icon: '🔗',
				description: `This URL may lead to a phishing site or malicious content. Always verify the destination before clicking within emails.`
			});
		}

		// Check Spam Status first
		if (selectedEmail?.metadatas['X-Spam-Status']?.includes('Yes')) {
			indicators.push({
				type: 'spam',
				category: 'Spam Detection',
				phrase: 'Yes',
				color: 'bg-red-500',
				icon: '⚠️',
				description:
					'This email has been flagged as spam by our detection system. Exercise caution.'
			});
		}

		// Check for blacklisted IP
		if (selectedEmail?.metadatas?.ipContext?.ip) {
			const isBlacklisted =
				selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_BL_SPAMCOP_NET') ||
				selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_XBL') ||
				selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_PBL');

			if (isBlacklisted) {
				indicators.push({
					type: 'ip',
					category: 'Blacklisted IP',
					phrase: selectedEmail.metadatas.ipContext.ip,
					color: 'bg-red-500',
					icon: '🚫',
					description: `The sender's IP address (${selectedEmail.metadatas.ipContext.ip}) appears on one or more IP blacklists. This suggests the IP has been associated with spam or malicious activity.`
				});
			}
		}

		// Process HTML content
		if (typeof document !== 'undefined') {
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = htmlContent;
			textContent = tempDiv.textContent || tempDiv.innerText || '';
		} else {
			textContent = htmlContent
				.replace(/<[^>]*>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		}

		const urgentPhrases = [
			'immediately',
			'urgent',
			'asap',
			'right now',
			'expire',
			'suspend',
			'verify now',
			'act now',
			'limited time',
			'deadline',
			'action required',
			'respond asap',
			'time sensitive',
			'immediate action',
			'critical alert',
			'important notice',
			'final notice',
			'account alert',
			'warning',
			'fast',
			'24 hours',
			'last chance',
			'must act',
			'claim',
			'today',
			'limited-time'
		];
		urgentPhrases.forEach((phrase) => {
			if (
				textContent.toLowerCase().includes(phrase.toLowerCase()) ||
				subjectLine.includes(phrase.toLowerCase())
			) {
				indicators.push({
					type: 'tone',
					category: subjectLine.includes(phrase) ? 'Urgent (Subject)' : 'Urgent',
					phrase,
					color: 'bg-yellow-500',
					icon: '⚠️',
					description: subjectLine.includes(phrase)
						? 'Creates false sense of urgency in subject line'
						: 'Creates false sense of urgency'
				});
			}
		});

		const fearPhrases = [
			'suspended',
            'suspension',
			'locked',
			'security breach',
			'unauthorized',
			'fraud',
			'compromise',
			'suspicious activity',
			'unusual login',
			'security alert',
			'account closure',
			'violation',
			'illegal activity',
			'suspicious transaction',
			'hacked',
            'bank',
            'account',
			'data breach',
			'identity theft',
			'criminal activity',
			'restricted access',
			'password expired',
			'account terminated',
			'payment declined',
			'penalties',
            'flagged',
		];
		fearPhrases.forEach((phrase) => {
			if (
				textContent.toLowerCase().includes(phrase.toLowerCase()) ||
				subjectLine.includes(phrase.toLowerCase())
			) {
				indicators.push({
					type: 'emotion',
					category: subjectLine.includes(phrase) ? 'Fear (Subject)' : 'Fear',
					phrase,
					color: 'bg-red-500',
					icon: '😨',
					description: subjectLine.includes(phrase)
						? 'Attempts to create fear or panic in subject line'
						: 'Attempts to create fear or panic'
				});
			}
		});

		const actionPhrases = ['click here', 'confirm', 'verify', 'update', 'login', 'download'];
		actionPhrases.forEach((phrase) => {
			if (textContent.toLowerCase().includes(phrase) || subjectLine.includes(phrase)) {
				indicators.push({
					type: 'action',
					category: subjectLine.includes(phrase) ? 'Call to Action (Subject)' : 'Call to Action',
					phrase,
					color: 'bg-purple-500',
					icon: '📩',
					description: subjectLine.includes(phrase)
						? 'Requests immediate action in subject line'
						: 'Requests immediate action from you'
				});
			}
		});

		const promotionalPhishingPhrases = [
			"you've won",
			'gift card',
			'win a prize',
			'congratulations',
			'you are a winner',
			'claim your reward',
			'limited time offer',
			'exclusive deal',
			'urgent attention needed',
			'account verification',
			'reset your password',
			'update your information',
			'confirm your account',
			'activate your bonus',
			'cash',
			'earn money',
			'work from home',
			'be your own boss',
			'free access',
			'free trial',
			'no cost',
			'no fees',
			'100% free',
			'guaranteed'
		];
		promotionalPhishingPhrases.forEach((phrase) => {
			if (
				textContent.toLowerCase().includes(phrase.toLowerCase()) ||
				subjectLine.includes(phrase.toLowerCase())
			) {
				indicators.push({
					type: 'promotion',
					category: subjectLine.includes(phrase)
						? 'Promotional Phishing (Subject)'
						: 'Promotional Phishing',
					phrase,
					color: 'bg-pink-500',
					icon: '🎁',
					description: subjectLine.includes(phrase)
						? 'Uses promotional bait in subject line to lure clicks'
						: 'Uses promotional tactics or false promises to lure interaction'
				});
			}
		});

		return indicators;
	}

	function highlightContent(content, indicators) {
		if (!content || !indicators.length) return content;

		let highlighted = content;

		indicators.forEach((indicator, index) => {
			// Get color values based on indicator type
			let bgColor, borderColor;
			switch (indicator.color) {
				case 'bg-orange-500':
					bgColor = 'rgba(249, 115, 22, 0.3)';
					borderColor = 'rgb(249, 115, 22)';
					break;
				case 'bg-yellow-500':
					bgColor = 'rgba(234, 179, 8, 0.3)';
					borderColor = 'rgb(234, 179, 8)';
					break;
				case 'bg-red-500':
					bgColor = 'rgba(239, 68, 68, 0.3)';
					borderColor = 'rgb(239, 68, 68)';
					break;
				case 'bg-purple-500':
					bgColor = 'rgba(168, 85, 247, 0.3)';
					borderColor = 'rgb(168, 85, 247)';
					break;
				default:
					bgColor = 'rgba(59, 130, 246, 0.3)';
					borderColor = 'rgb(59, 130, 246)';
			}

			if (indicator.type === 'url') {
				// URL highlighting logic remains the same
				const escapedUrl = indicator.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const patterns = [
					`<a[^>]*?href=["']${escapedUrl}["'][^>]*>(.*?)<\/a>`,
					`(?<!["'])${escapedUrl}(?![^<]*>|[^<>]*<\/a>)`
				];

				patterns.forEach((pattern) => {
					const regex = new RegExp(pattern, 'gi');
					highlighted = highlighted.replace(regex, (match, linkText) => {
						if (linkText) {
							return `<span class="indicator-highlight" data-indicator="${index}" style="background-color: ${bgColor}; padding: 2px 4px; border-radius: 3px; cursor: pointer; border: 2px solid ${borderColor};">${linkText}</span>`;
						} else {
							return `<span class="indicator-highlight" data-indicator="${index}" style="background-color: ${bgColor}; padding: 2px 4px; border-radius: 3px; cursor: pointer; border: 2px solid ${borderColor};">${match}</span>`;
						}
					});
				});
			} else {
				// Apply consistent styling for other indicators
				const regex = new RegExp(`(${indicator.phrase})`, 'gi');
				highlighted = highlighted.replace(
					regex,
					`<span class="indicator-highlight" data-indicator="${index}" style="background-color: ${bgColor}; padding: 2px 4px; border-radius: 3px; cursor: pointer; border: 2px solid ${borderColor};">$1</span>`
				);
			}
		});

		return highlighted;
	}

	$: subjectHighlighted = selectedEmail?.subject
		? highlightContent(selectedEmail.subject, subjectIndicators)
		: '';

	$: if (htmlContainer && selectedEmail?.metadatas?.htmlBody) {
		htmlContainer.innerHTML = highlightContent(selectedEmail.metadatas.htmlBody, indicators);
		addIndicatorListeners();
	}

	$: if (selectedEmail) {
		// Wait for DOM update
		setTimeout(() => {
			addIndicatorListeners();
		}, 0);
	}

	function addIndicatorListeners() {
		const emailBody = htmlContainer;
		const subjectContainer = document.querySelector('.email-subject');

		if (emailBody) {
			const bodyHighlights = emailBody.querySelectorAll('.indicator-highlight');
			addListenersToElements(bodyHighlights, bodyIndicators);
		}

		if (subjectContainer) {
			const subjectHighlights = subjectContainer.querySelectorAll('.indicator-highlight');
			addListenersToElements(subjectHighlights, subjectIndicators);
		}
	}

	function addListenersToElements(elements, sourceIndicators) {
		elements.forEach((element) => {
			element.addEventListener('mouseenter', (e) => {
				const indicatorIndex = parseInt(e.target.dataset.indicator);
				hoveredIndicator = sourceIndicators[indicatorIndex];
			});
			element.addEventListener('mouseleave', () => {
				hoveredIndicator = null;
			});
		});
	}

	function switchTab(tabName) {
		activeTab = tabName;
	}

	async function fetchRawEmail() {
		if (!selectedEmail?.messageId) return;

		try {
			rawEmailContent = await api.getRawEmail(selectedEmail.messageId);
			showRawModal = true;
		} catch (error) {
			console.error('Failed to fetch raw email:', error);
			// Optionally add user feedback for the error
			rawEmailContent = 'Failed to load raw email content. Please try again.';
			showRawModal = true;
		}
	}

	// Pagination variables
	let currentPage = 0;
	let itemsPerPage = 4;

	// Calculate total pages
	$: totalPages = Math.ceil(indicators.length / itemsPerPage);

	// Get current page items
	$: currentPageItems = indicators.slice(
		currentPage * itemsPerPage,
		(currentPage + 1) * itemsPerPage
	);

	// Go to next page
	function nextPage() {
		if (currentPage < totalPages - 1) {
			currentPage++;
		}
	}

	// Go to previous page
	function previousPage() {
		if (currentPage > 0) {
			currentPage--;
		}
	}

	// Add this in the script section near the other state variables
	let showSidebar = true;

	function toggleSidebar() {
		showSidebar = !showSidebar;
	}

	function selectEmail(email) {
		selectedEmail = email;
		showSidebar = false; // Auto-collapse sidebar when email is selected
	}
</script>

<div class="flex h-screen bg-[#282a36] font-sans text-white">
	<!-- Sidebar Toggle Button - Only visible when not on home tab -->
	<button
		class="fixed left-4 z-50 rounded-full bg-[#bd93f9] p-2 text-[#282a36] shadow-lg transition-all hover:bg-[#8be9fd] {activeTab ===
		'home'
			? 'hidden'
			: ''}"
		style="top: 1.5rem;"
		on:click={toggleSidebar}
		aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
	>
		<svg
			class="h-6 w-6 transform transition-transform {showSidebar ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d={showSidebar ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
			/>
		</svg>
	</button>

	<!-- Collapsible Sidebar -->
	<aside
		class="scrollbar-hide fixed top-0 left-0 h-full w-80 transform overflow-y-auto border-r border-[#44475a] bg-[#282a36] p-4 transition-transform duration-300 ease-in-out {showSidebar &&
		activeTab !== 'home'
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<h1 class="mt-14 mb-4 text-2xl font-bold text-[#bd93f9]">Inbox</h1>
		<!-- Replace the existing email list in the sidebar -->
		<ul>
			{#each emails as email (email.id)}
				<li>
					<button
						class="mb-3 w-full cursor-pointer rounded-lg p-4 text-left transition-colors duration-200 hover:bg-[#44475a] focus:ring-2 focus:ring-[#bd93f9] focus:outline-none {selectedEmail?.id === email.id ? 'bg-[#44475a]' : ''}"
						on:click={() => selectEmail(email)}
					>
						<div class="text-lg font-medium">{email.subject}</div>
						<div class="text-sm text-gray-400">{email.sender}</div>
						<div class="text-xs text-gray-600">
							{new Date(email.metadatas.Date).toLocaleString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
								hour: 'numeric',
								minute: '2-digit',
								hour12: true
							})}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	</aside>

	<!-- Main Content -->
	<main
		class="flex-1 overflow-y-auto p-6 transition-all duration-300 {showSidebar &&
		activeTab !== 'home'
			? 'ml-80'
			: 'ml-0'}"
	>
		<div class="grid grid-cols-2 gap-6">
			<!-- Floating Navigation Tabs -->
			<section class="col-span-2 mb-6">
				<nav class="flex justify-center">
					<div class="rounded-2xl border border-[#6272a4] bg-[#44475a] p-2 shadow-lg">
						<div class="flex space-x-2">
							<button
								class="rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 {activeTab ===
								'home'
									? 'bg-[#bd93f9] text-[#282a36] shadow-md'
									: 'text-gray-300 hover:bg-[#6272a4] hover:text-white'}"
								on:click={() => switchTab('home')}
							>
								Home
							</button>
							<button
								class="rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 {activeTab ===
								'analysis'
									? 'bg-[#bd93f9] text-[#282a36] shadow-md'
									: 'text-gray-300 hover:bg-[#6272a4] hover:text-white'}"
								on:click={() => switchTab('analysis')}
							>
								Email Analysis
							</button>
							<button
								class="rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 {activeTab ===
								'sender'
									? 'bg-[#bd93f9] text-[#282a36] shadow-md'
									: 'text-gray-300 hover:bg-[#6272a4] hover:text-white'}"
								on:click={() => switchTab('sender')}
							>
								Sender Reputation
							</button>
							<button
								class="rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 {activeTab ===
								'security'
									? 'bg-[#bd93f9] text-[#282a36] shadow-md'
									: 'text-gray-300 hover:bg-[#6272a4] hover:text-white'}"
								on:click={() => switchTab('security')}
							>
								Spam Risk
							</button>
						</div>
					</div>
				</nav>
			</section>

			<!-- Tab Content -->
			{#if activeTab === 'home'}
				<!-- Welcome Section -->
				<section
					class="col-span-2 rounded-xl border border-[#6272a4] bg-[#44475a] p-8 shadow-lg"
				>
					<div class="mb-2 text-center">
						<h1 class="mb-4 text-4xl font-bold text-[#bd93f9]">
							✉️ Postmark Email Inbox Challenge 2025
						</h1>
						<p class="mb-2 text-xl text-[#f8f8f2]">
							A proof of concept showcasing the features and potential of Postmark's inbound
							email processing API for builders.
						</p>
						<p class="mb-1 text-sm text-gray-400">Created By: Jhade McConnell</p>
					</div>
				</section>
				<!-- Add this before the closing </div> in each tab section -->
				<section class="col-span-2 mb-2">
					<div
						class="group relative overflow-hidden rounded-xl border border-[#6272a4] bg-gradient-to-r from-[#282a36] to-[#44475a] p-6 shadow-lg transition-all hover:border-[#bd93f9]"
					>
						<!-- Background Gradient Animation -->
						<div
							class="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/10 to-[#8be9fd]/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
						></div>

						<!-- Content -->
						<div
							class="relative flex flex-col items-center space-y-4 md:flex-row md:justify-between md:space-y-0"
						>
							<!-- Left side with text -->
							<div class="flex-1 space-y-2 text-center md:text-left">
								<h3 class="text-xl font-bold text-[#bd93f9]">
									🚀 Build and Monetize Your LLM
								</h3>
								<p class="text-sm text-[#f8f8f2]">
									Build your AI business with a simple chatbot. Create, deploy, and monetize AI services using our platform.
								</p>
								<div class="flex flex-wrap gap-3">
									<span
										class="inline-flex items-center rounded-full bg-[#44475a] px-3 py-1 text-xs text-[#8be9fd]"
									>
										Easy Integration
									</span>
									<span
										class="inline-flex items-center rounded-full bg-[#44475a] px-3 py-1 text-xs text-[#50fa7b]"
									>
										Revenue Sharing
									</span>
									<span
										class="inline-flex items-center rounded-full bg-[#44475a] px-3 py-1 text-xs text-[#ffb86c]"
									>
										Developer Support
									</span>
								</div>
							</div>

							<!-- Right side with CTA -->
							<div class="flex items-center space-x-2">
								<a
									href="https://steponeis.com"
									target="_blank"
									rel="noopener noreferrer"
									class="group relative inline-flex items-center overflow-hidden rounded-lg bg-[#bd93f9] px-6 py-3 text-sm font-medium text-[#282a36] transition-all duration-300 hover:bg-[#8be9fd] hover:shadow-lg"
								>
									<span class="relative">
										Start Building
									</span>
								</a>
							</div>
						</div>

						<!-- Decorative Elements -->
						<div
							class="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#bd93f9]/10 blur-2xl"
						></div>
						<div
							class="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[#8be9fd]/10 blur-2xl"
						></div>
					</div>
				</section>
				<!-- How to Use Guide -->
				<section
					class="col-span-2 mb-4 rounded-xl border border-[#6272a4] bg-[#44475a] p-6 shadow-lg"
				>
					<h2 class="mb-6 flex items-center text-2xl font-semibold text-[#bd93f9]">
						<span class="mr-3">🦈</span>
						Swordphish: A Security Tool for Email Forensics
					</h2>

					<div class="mb-2 grid grid-cols-1 gap-6 md:grid-cols-2">
						<!-- Step 1 -->
						<div
							class="rounded-lg border border-[#6272a4] bg-[#383a59] p-6 transition-all duration-300 hover:border-[#bd93f9]"
						>
							<div class="mb-4 flex items-center">
								<h3 class="text-lg font-semibold text-[#f8f8f2]">What is Swordphish?</h3>
							</div>
							<p class="mb-3 text-sm text-gray-300">
								Swordphish is a proof of concept security tool that visualizes phishing attacks within emails in real-time. It uses Postmark's inbound procesing feature to parse and analyze an email.<br>
                                <br>The results are displayed in a user-friendly interface. It highlights potential phishing threats and shows the email's metadata for security analysis.<br>
							</p>
						</div>

						<!-- Step 2 -->
						<div
							class="rounded-lg border border-[#6272a4] bg-[#383a59] p-6 transition-all duration-300 hover:border-[#bd93f9]"
						>
							<div class="flex items-center">
								<h3 class="text-lg font-semibold text-[#f8f8f2]">The Technologies Used</h3>
							</div>
							<p class="mb-2 text-sm text-gray-300">                                
                                <br> ✉️ Postmark's inbound processing feature parses the email for analysis.<br>
                                <br> 🤖 A custom LLM (Swordphish AI) analyzes the email and provides security insights.<br>
                                <br> 🔒 Security rules are checked against the email's content and metadata to detect potential phishing attempts. <br>
							</p>
						</div>
					</div>
				</section>

				<!-- How to Use Guide -->
				<section
					class="col-span-2 mb-4 rounded-xl border border-[#6272a4] bg-[#44475a] p-6 shadow-lg"
				>
					<h2 class="mb-6 flex items-center text-2xl font-semibold text-[#bd93f9]">
						<span class="mr-3">💭</span>
						Instructions for Using Swordphish
					</h2>

					<p class="mb-4 text-l text-[#f8f8f2]">
						You can try out Postmark's inbound processing feature by forwarding an email to analyze, or viewing one of the email examples.
					</p>

					<div class="grid grid-cols-1 gap-6 md:grid-cols-1">
						<!-- Step 1 -->
						<div
							class="rounded-lg border border-[#6272a4] bg-[#383a59] p-6 transition-all duration-300 hover:border-[#bd93f9]"
						>
							<div class="mb-4 flex items-center">
								<div
									class="mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#bd93f9] font-bold text-[#282a36]"
								>
									1
								</div>
								<h3 class="text-lg font-semibold text-[#f8f8f2]">Setup</h3>
							</div>
							<div class="mb-4 rounded bg-[#282a36] p-2 text-xs text-[#8be9fd]">
								💡 Tip: Start with emails that seem urgent or asks for personal information.
							</div>
							<p class="mb-3 text-sm text-gray-300">
								Find an email you want to analyze a phishing attempt for, then forward it to abuse@scan.steponeis.com.
							</p>
						</div>

						<!-- Step 2 -->
						<div
							class="rounded-lg border border-[#6272a4] bg-[#383a59] p-6 transition-all duration-300 hover:border-[#bd93f9]"
						>
							<div class="mb-4 flex items-center">
								<div
									class="mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#bd93f9] font-bold text-[#282a36]"
								>
									2
								</div>
								<h3 class="text-lg font-semibold text-[#f8f8f2]">Refresh the Email Analysis Tab</h3>
							</div>
							<div class="mb-4 rounded bg-[#282a36] p-2 text-xs text-[#f1fa8c]">
								⚠️ This application uses a local database to save information. Do not submit any personal or sensitive information.
							</div>
							<p class="mb-3 text-sm text-gray-300">
								The inbox will display some test emails. You will see the email you forwarded appear in this list. Once you see your email, click on it to view the analysis.
							</p>
						</div>

						<!-- Step 3 -->
						<div
							class="rounded-lg border border-[#6272a4] bg-[#383a59] p-6 transition-all duration-300 hover:border-[#bd93f9]"
						>
							<div class="mb-4 flex items-center">
								<div
									class="mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#bd93f9] font-bold text-[#282a36]"
								>
									3
								</div>
								<h3 class="text-lg font-semibold text-[#f8f8f2]">Analyze Content</h3>
							</div>
                            <div class="mb-4 rounded bg-[#282a36] p-2 text-xs text-[#ff5555]">
								🎯 Hover over highlights to understand what makes this content suspicious.
							</div>
							<p class="mb-3 text-sm text-gray-300">
								Explore the analysis of the email's contents within the "Email Analysis", "Sender Reputation", and "Security" tabs.
							</p>
						</div>
					</div>
				</section>
			{:else if activeTab === 'analysis'}
				<section class="col-span-2 mb-1 rounded-xl bg-[#44475a] p-6 shadow-lg">
					<h2 class="mb-4 text-xl font-semibold text-[#bd93f9]">Email Analysis</h2>
					<p class="text-sm text-gray-400">
						An analysis of the email's contents. Hover over the highlighted text to see what makes it suspicious.
					</p>
				</section>
				<!-- Email Analysis Tab -->
				<div class="col-span-2 mb-4">
					<div class="space-y-4 rounded-lg border border-[#bd93f9] bg-[#383a59] p-4">
						<!-- AI Analysis Text -->
						<h2 class="mb-4 text-xl font-semibold text-[#bd93f9]">Swordphish AI</h2>
						<div class="text-base text-[#50fa7b] italic">
							{aiAnalysis}
						</div>
						<div class="mb-2 text-xs text-gray-400">
							This is an AI analysis of the email's contents. Always verify the results.
						</div>
					</div>
				</div>
				<div class="col-span-2 grid grid-cols-1 gap-6 lg:grid-cols-5">
					<!-- Email Content - Traditional Email Layout with Dracula Theme -->
					<section
						class="col-span-1 overflow-hidden rounded-xl border border-[#44475a] bg-[#282a36] shadow-lg lg:col-span-3"
					>
						<!-- Email Header -->
						<div class="border-b border-[#44475a] bg-[#383a59] px-6 py-4">
							<!-- Subject Line -->
							<div class="mb-4">
								<h1 class="email-subject text-xl leading-tight font-semibold text-[#f8f8f2]">
									{@html subjectHighlighted || selectedEmail.subject}
								</h1>
							</div>

							<!-- From/To/Date Info -->
							<div class="space-y-3">
								<!-- From -->
								<div class="flex items-center space-x-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-[#bd93f9] text-sm font-medium text-[#282a36]"
									>
										{selectedEmail.metadatas.fromName
											? selectedEmail.metadatas.fromName.charAt(0).toUpperCase()
											: 'U'}
									</div>
									<div class="flex-1">
										<div class="flex items-center space-x-2">
											<span class="text-sm font-medium text-[#f8f8f2]"
												>{selectedEmail.metadatas.fromName || 'Unknown Sender'}</span
											>
											<span class="text-xs text-[#6272a4]"
												>&lt;{selectedEmail.metadatas.From}&gt;</span
											>
										</div>
										<div class="text-xs text-[#8be9fd]">
											<span class="font-medium">to</span>
											<span>{selectedEmail.metadatas.To || 'me'}</span>
										</div>
									</div>
									<div class="text-right">
										<div class="text-xs text-[#6272a4]">{selectedEmail.metadatas.Date}</div>
									</div>
								</div>

								<!-- Additional Email Details (Collapsible) -->
								<div class="border-t border-[#44475a] pt-3">
									<button
										class="flex items-center space-x-2 text-sm text-[#6272a4] transition-colors hover:text-[#8be9fd]"
										on:click={() => (showDetails = !showDetails)}
									>
										<span>Metadata</span>
										<svg
											class="h-4 w-4 transform transition-transform {showDetails
												? 'rotate-180'
												: ''}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											></path>
										</svg>
									</button>

									{#if showDetails}
										<div class="mt-3 space-y-2 rounded-lg bg-[#44475a] p-3 text-sm">
											<div>
												<span class="font-medium text-[#bd93f9]">Spam Status:</span>
												<span class="text-[#f8f8f2]">
													{#if selectedEmail.metadatas['X-Spam-Status']?.includes('Yes')}
														<span class="text-[#ef4444]">Yes</span>
													{:else}
														{selectedEmail.metadatas['X-Spam-Status'] || 'Not available'}
													{/if}
												</span>
											</div>
											<div>
												<span class="font-medium text-[#bd93f9]">Spam Score:</span>
												<span class="text-[#f8f8f2]"
													>{selectedEmail.metadatas['X-Spam-Score'] || 'Not available'}</span
												>
											</div>
											<div>
												<span class="font-medium text-[#bd93f9]">Sender IP Address:</span>
												<span class="text-[#f8f8f2]">
													{#if selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_BL_SPAMCOP_NET') || selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_XBL') || selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_PBL')}
														<span class="text-[#ef4444]"
															>{selectedEmail.metadatas.ipContext?.ip || 'Not available'}</span
														>
													{:else}
														{selectedEmail.metadatas.ipContext?.ip || 'Not available'}
													{/if}
												</span>
											</div>
											{#if selectedEmail.metadatas.Subject}
												<div>
													<span class="font-medium text-[#bd93f9]">Subject:</span>
													<span class="text-[#f8f8f2]">{selectedEmail.metadatas.Subject}</span>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- Email Body -->
						<div class="bg-[#282a36]">
							<div class="px-6 py-6">
								<div
									class="prose prose-invert max-w-none leading-relaxed text-[#f8f8f2]"
									bind:this={htmlContainer}
								>
									<!-- Email content will be inserted here -->
								</div>
							</div>

							<!-- Attachments Section (if any) -->
							{#if selectedEmail.attachments && selectedEmail.attachments.length > 0}
								<div class="border-t border-[#44475a] bg-[#383a59] px-6 py-4">
									<h4 class="mb-3 flex items-center text-sm font-medium text-[#bd93f9]">
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
											></path>
										</svg>
										Attachments ({selectedEmail.attachments.length})
									</h4>
									<div class="space-y-2">
										{#each selectedEmail.attachments as attachment}
											<div
												class="flex items-center space-x-3 rounded border border-[#6272a4] bg-[#44475a] p-2 hover:bg-[#50526e]"
											>
												<svg
													class="h-5 w-5 text-[#6272a4]"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
													></path>
												</svg>
												<div class="flex-1">
													<div class="text-sm font-medium text-[#f8f8f2]">{attachment.name}</div>
													<div class="text-xs text-[#6272a4]">
														{attachment.size || 'Unknown size'}
													</div>
												</div>
												<button class="text-sm font-medium text-[#8be9fd] hover:text-[#bd93f9]"
													>Download</button
												>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</section>

					<!-- Analysis Sidebar -->
					<section
						class="col-span-1 min-w-0 rounded-xl border border-[#44475a] bg-[#282a36] shadow-lg lg:col-span-2"
					>
						<div class="p-6">
							<div class="mb-2 flex items-center justify-between">
								<h3 class="text-lg font-semibold text-[#bd93f9]">Threat Analysis</h3>
							</div>
							<div class="mb-4 text-xs text-gray-400">
								This details potential threats detected from this email.
							</div>

							<!-- Indicators List -->
							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-medium tracking-wide text-[#8be9fd] uppercase">
										Indicators
									</h4>
									{#if indicators.length > itemsPerPage}
										<div class="text-xs text-[#6272a4]">
											Page {currentPage + 1} of {totalPages}
										</div>
									{/if}
								</div>

								{#if indicators.length > 0}
									<div class="space-y-3">
										{#each currentPageItems as indicator}
											<div
												class="flex items-start space-x-3 rounded-lg border border-[#44475a] bg-[#383a59] p-3 transition-all duration-200 hover:bg-[#50526e] hover:shadow-lg {hoveredIndicator &&
												hoveredIndicator.phrase === indicator.phrase
													? 'border-[#bd93f9] bg-[#282a36] shadow-lg ring-2 ring-[#bd93f9]'
													: ''}"
											>
												<span class="mt-0.5 text-lg">{indicator.icon}</span>
												<div class="min-w-0 flex-1">
													<div class="mb-1 flex min-w-0 items-center justify-between">
														<div
															class="truncate pr-2 text-sm font-medium {hoveredIndicator &&
															hoveredIndicator.phrase === indicator.phrase
																? 'text-[#bd93f9]'
																: 'text-[#f8f8f2]'}"
														>
															{indicator.category}
														</div>
														<div class="h-2 w-2 rounded-full {indicator.color} flex-shrink-0"></div>
													</div>
													<div
														class="mb-2 rounded {hoveredIndicator &&
														hoveredIndicator.phrase === indicator.phrase
															? 'bg-[#383a59]'
															: 'bg-[#44475a]'} px-2 py-1 font-mono text-xs break-all text-[#8be9fd]"
													>
														"{indicator.phrase}"
													</div>
													<div class="text-xs leading-relaxed break-words text-[#f8f8f2]">
														{indicator.description}
													</div>
												</div>
											</div>
										{/each}
									</div>

									{#if indicators.length > itemsPerPage}
										<div
											class="mt-4 flex items-center justify-between border-t border-[#44475a] pt-4"
										>
											<button
												class="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm text-[#f8f8f2] transition-colors {currentPage ===
												0
													? 'cursor-not-allowed opacity-50'
													: 'hover:bg-[#44475a] hover:text-[#8be9fd]'}"
												on:click={previousPage}
												disabled={currentPage === 0}
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 19l-7-7 7-7"
													/>
												</svg>
												<span>Previous</span>
											</button>

											<div class="text-sm text-[#6272a4]">
												Page {currentPage + 1} of {totalPages}
											</div>

											<button
												class="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm text-[#f8f8f2] transition-colors {currentPage ===
												totalPages - 1
													? 'cursor-not-allowed opacity-50'
													: 'hover:bg-[#44475a] hover:text-[#8be9fd]'}"
												on:click={nextPage}
												disabled={currentPage === totalPages - 1}
											>
												<span>Next</span>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</button>
										</div>
									{/if}
								{:else}
									<div class="py-8 text-center">
										<svg
											class="mx-auto mb-3 h-12 w-12 text-[#50fa7b]"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
											></path>
										</svg>
										<div class="mb-1 text-sm font-medium text-[#50fa7b]">No Threats Detected</div>
										<div class="text-xs text-[#6272a4]">This email appears to be safe</div>
									</div>
								{/if}
							</div>

							<!-- Quick Actions -->
							<div class="mt-6 border-t border-[#44475a] pt-4">
								<h4 class="mb-3 text-sm font-medium text-[#8be9fd]">Quick Actions</h4>
								<div class="space-y-2">
									<button
										class="w-full rounded-lg px-3 py-2 text-left text-sm text-[#f8f8f2] transition-colors hover:bg-[#44475a] hover:text-[#8be9fd]"
										on:click={fetchRawEmail}
									>
										🔍 Raw Email
									</button>
								</div>
							</div>
						</div>
					</section>
				</div>
			{:else if activeTab === 'sender'}
				<!-- Sender Information Tab -->
				<section class="col-span-2 mb-1 rounded-xl bg-[#44475a] p-6 shadow-lg">
					<h2 class="mb-4 text-xl font-semibold text-[#bd93f9]">Sender Reputation</h2>
					<p class="text-sm text-gray-400">
						Learn more about where this email came from and how it got to your inbox. If you don't
						recognize the sender, it's best to report the email and leave it alone. Location and ASN
						returns test data for now.
					</p>
				</section>
				<div class="col-span-2 mb-4">
					<div class="space-y-4 rounded-lg border border-[#bd93f9] bg-[#383a59] p-4">
						<!-- AI Analysis Text -->
						<h2 class="mb-4 text-xl font-semibold text-[#bd93f9]">Swordphish AI</h2>
						<div class="text-base text-[#50fa7b] italic">
							{aiSenderAnalysis}
						</div>
						<div class="mb-2 text-xs text-gray-400">
							This is an AI analysis of the email's contents. Always verify the results.
						</div>
					</div>
				</div>
				<div class="col-span-2 grid grid-cols-2 gap-6">
					<!-- Sender Location Details -->
					<section class="rounded-xl bg-[#44475a] p-6 shadow-lg">
						<h2 class="mb-2 text-xl font-semibold text-[#bd93f9]">Client IP Address</h2>
						<div class="mt-2 mb-4 text-xs text-gray-400">
							This is an overview of the where the email's sending client originated from.
						</div>
						<div class="mb-2 text-sm">
							<b>IP Address:</b>
							{selectedEmail.metadatas.ipContext.ip}
						</div>
						<div class="mb-2 text-sm">
							<b>Location:</b>
							{selectedEmail.metadatas.ipContext.location}
						</div>
						<div class="mb-2 text-sm">
							<b>ASN:</b>
							{selectedEmail.metadatas.ipContext.asn}
						</div>
						<div class="mb-4">
							<div class="text-sm">
								<b>IP Reputation:</b>
								<span
									class={`ml-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white
                                    ${selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_BL_SPAMCOP_NET') || 
                                      selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_XBL') || 
                                      selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_PBL')
                                        ? 'bg-red-500'
                                        : selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_DNSWL_LOW')
                                            ? 'bg-green-500'
                                            : 'bg-yellow-500'}`}
								>
									{selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_BL_SPAMCOP_NET') || 
                                     selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_XBL') || 
                                     selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_PBL')
										? 'Bad'
										: selectedEmail.metadatas['X-Spam-Tests']?.includes('RCVD_IN_DNSWL_LOW')
											? 'Good'
											: 'Neutral'}
								</span>
							</div>
						</div>
					</section>

					<!-- Identity Verification Section -->
					<section class="rounded-xl bg-[#44475a] p-6 shadow-lg">
						<h2 class="mb-2 text-xl font-semibold text-[#bd93f9]">SPF Verification</h2>
						<div class="mb-4 text-xs text-gray-400">
							We verify if the sending domain approved the source IP that sent the message.
						</div>
						<div class="mb-2 text-sm">
							<b>Sender Email:</b>
							<span class={selectedEmail.metadatas.From}>
								{selectedEmail.metadatas.From || 'Unknown Sender'}
							</span>
						</div>

						<div class="mb-4 text-sm">
							<b>Verification Status:</b>
							<span
								class={`ml-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white
                                ${selectedEmail.metadatas['Received-SPF'].includes('pass') ? 'bg-green-500' : 'bg-red-500'}`}
							>
								{selectedEmail.metadatas['Received-SPF'].includes('pass')
									? 'Verified'
									: 'Unverified'}
							</span>
						</div>
					</section>
					<!-- Bounce Analyzer -->
					<section class="rounded-xl bg-[#44475a] p-6 shadow-lg">
						<h2 class="mb-2 text-xl font-semibold text-[#bd93f9]">Bounce Analyzer</h2>
						<div class="mb-4 text-xs text-gray-400">
							Checks if the bounce address seems legitimate or may have been spoofed.
						</div>
						<div class="mb-2 text-sm">
							<b>Bounce Address:</b>
							<span class={selectedEmail.metadatas.From}>
								{selectedEmail.metadatas.From || 'Unknown Sender'}
							</span>
						</div>

						<!-- Validation Status -->
						<div class="mb-4">
							<div class="text-sm">
								<b>Status:</b>
								<span
									class={`ml-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white
                                    ${selectedEmail.metadatas['Return-Path'] == selectedEmail.sender ? 'bg-green-500' : 'bg-red-500'}`}
								>
									{selectedEmail.metadatas['Return-Path'] == selectedEmail.sender
										? 'Normal'
										: 'Risky'}
								</span>
							</div>
						</div>
					</section>
				</div>
			{:else if activeTab === 'security'}
				<section class="col-span-2 mb-1 rounded-xl bg-[#44475a] p-6 shadow-lg">
					<h2 class="mb-4 text-xl font-semibold text-[#bd93f9]">Spam Risk</h2>
					<p class="text-sm text-gray-400">Understand the spam risk associated with this email. If the spam score is high, proceed with caution as this email may be spam.</p>
				</section>
				<!-- Spam Risk Tab -->
				<div class="col-span-2 mb-4">
					<div class="space-y-4 rounded-lg border border-[#bd93f9] bg-[#383a59] p-4">
						<!-- AI Analysis Text -->
						<h2 class="mb-4 text-xl font-semibold text-[#bd93f9]">Swordphish AI</h2>
						<div class="text-base text-[#50fa7b] italic">
							{aiSecurityAnalysis}
						</div>
						<div class="mb-2 text-xs text-gray-400">
							This is an AI analysis of the email's contents. Always verify the results.
						</div>
					</div>
				</div>
				<div class="col-span-2 grid grid-cols-2 gap-6">
					<!-- SpamAssassin Details -->
					<section class="col-span-2 rounded-xl bg-[#44475a] p-6 shadow-lg">
						<h2 class="mb-2 text-xl font-semibold text-[#bd93f9]">Spam Risk Analysis</h2>
						<div class="mb-4 text-xs text-gray-400">
							We analyze the initial spam risk of the email.
						</div>
						<!-- Spam Status -->
						<div class="mb-4">
							<div class="text-sm">
								<b>Spam Status:</b>
								<span
									class={`ml-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white
                                    ${selectedEmail.metadatas['X-Spam-Status']?.includes('Yes') ? 'bg-red-500' : 'bg-green-500'}`}
								>
									{selectedEmail.metadatas['X-Spam-Status']?.includes('Yes')
										? 'Spam Detected'
										: 'Not Spam'}
								</span>
							</div>
						</div>

						<!-- Spam Score -->
						<div class="mb-4">
							<div class="text-sm">
								<b>Spam Score:</b>
								<div class="ml-2 inline-flex items-center gap-2">
									<span
										class={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white
                                        ${
																					parseFloat(selectedEmail.metadatas['X-Spam-Score']) > 5
																						? 'bg-red-500'
																						: parseFloat(selectedEmail.metadatas['X-Spam-Score']) >
																							  0
																							? 'bg-yellow-500'
																							: 'bg-green-500'
																				}`}
									>
										{selectedEmail.metadatas['X-Spam-Score']}
									</span>
									<span class="text-xs text-gray-400">(Scores above 5 are considered spam)</span>
								</div>
							</div>
						</div>

						<!-- DKIM and Test Results -->
						<div class="mb-4">
							<div class="mb-2 text-sm font-medium">Test Results:</div>
							<div class="flex flex-wrap gap-2">
								{#each ['DKIM_SIGNED', 'DKIM_VALID', 'DKIM_VALID_AU', 'RCVD_IN_DNSWL_LOW'] as testFlag}
									<span
										class={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white
                                        ${selectedEmail.metadatas['X-Spam-Tests']?.includes(testFlag) ? 'bg-green-500' : 'bg-red-500'}`}
									>
										{testFlag.replace('DKIM_', '').replace('_', ' ')}:
										{selectedEmail.metadatas['X-Spam-Tests']?.includes(testFlag) ? 'Pass' : 'Fail'}
									</span>
								{/each}
							</div>
						</div>

						<!-- Version Info -->
						<div class="mt-4 text-xs text-gray-400">
							<a
								href="https://spamassassin.apache.org/old/tests_3_3_x.html"
								class="text-[#8be9fd] hover:text-[#bd93f9] hover:underline"
								target="_blank"
								rel="noopener noreferrer"
								>Apache SpamAssassin Version {selectedEmail.metadatas['X-Spam-Checker-Version']}</a
							>
						</div>
					</section>
				</div>
			{/if}
		</div>
	</main>
</div>

{#if showRawModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<!-- Semi-transparent backdrop -->
		<div class="bg-opacity-70 absolute inset-0 bg-[#282a36] backdrop-blur-sm"></div>

		<!-- Modal content -->
		<div
			class="relative max-h-[80vh] w-3/4 rounded-xl border border-[#6272a4] bg-[#282a36] p-6 shadow-xl"
		>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-xl font-semibold text-[#bd93f9]">Raw Email Content</h3>
				<button
					class="rounded-lg p-2 text-[#f8f8f2] hover:bg-[#44475a]"
					on:click={() => (showRawModal = false)}
				>
					✕
				</button>
			</div>
			<div class="max-h-[60vh] overflow-y-auto rounded-lg bg-[#44475a] p-4">
				<pre class="font-mono text-sm whitespace-pre-wrap text-[#f8f8f2]">{rawEmailContent}</pre>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.indicator-highlight) {
		transition: all 0.2s ease;
		display: inline-block;
	}

	:global(.indicator-highlight:hover) {
		transform: scale(1.02);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	/* Add specific styling for subject highlights if needed */
	:global(.email-subject .indicator-highlight) {
		padding: 0 4px;
		border-radius: 3px;
	}

	/* ... existing styles ... */

	:global(body) {
		overflow: hidden;
	}

	/* Hide scrollbar but maintain functionality */
	:global(.scrollbar-hide) {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	:global(.scrollbar-hide::-webkit-scrollbar) {
		display: none; /* Chrome, Safari, Opera */
	}

	main {
		padding-top: 1rem;
	}

	aside {
		z-index: 40;
		margin-top: 1rem; /* Add spacing from top to align with nav */
	}
</style>