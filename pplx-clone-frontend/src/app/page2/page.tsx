"use client";

// import Image from "next/image";
import Head from "next/head";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";

interface Source {
	title: string;
	url: string;
	content: string;
}

// const API_URL = "http://localhost:8001";
const API_URL = "https://pplx-hitl.onrender.com";

export default function Home() {
	const [input, setInput] = useState("");
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [output, setOutput] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const outputRef = useRef<HTMLDivElement>(null);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [sources, setSources] = useState<Source[]>([]);
	const [heading, setHeading] = useState("");
	const [isTextAreaDisabled, setIsTextAreaDisabled] = useState(false);
	const [textAreaPlaceholder, setTextAreaPlaceholder] =
		useState("Ask a question...");

	const [searchingText, setSearchingText] = useState("");
	// const [feedbackIncorporated, setFeedbackIncorporated] = useState(false);

	const textAreaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		const data = sessionStorage.getItem("inputQuery");
		if (data) {
			setInput(data); // Set into input bar

			// setTimeout(() => {
			// 	startReasoningOrFeedback();
			// 	sessionStorage.removeItem("inputQuery");
			// }, 2000);

			//   startReasoningOrFeedback();
			sessionStorage.removeItem("inputQuery"); // optional cleanup
		}
	}, []);

	useEffect(() => {
		const textArea = textAreaRef.current;

		if (textArea) {
			textArea.style.height = "auto"; // Reset height
			textArea.style.height = `${textArea.scrollHeight}px`; // Set to scrollHeight
		}
	}, [input]);

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
		const textArea = textAreaRef.current;

		if (textArea) {
			textArea.style.height = "auto"; // Reset height
			textArea.style.height = `${textArea.scrollHeight}px`; // Set to scrollHeight
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault(); // Prevents newline
			startReasoningOrFeedback();
		}
	};

	const startReasoningOrFeedback = async () => {
		setInput("");
		setSearchingText("Searching");

		if (!isStreaming) {
			setHeading(input);

			if (!input.trim()) return;
			setOutput("");
			setIsStreaming(true);

			// Start a new session
			const startRes = await fetch(`${API_URL}/start`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: input }),
			});
			const data = await startRes.json();
			const id = data.session_id;
			setSessionId(id);

			// Start streaming response
			const streamRes = await fetch(`${API_URL}/stream/${id}`);
			const reader = streamRes.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) return;

			// let firstChunkProcessed = false;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				console.log(`chunk: ${chunk}`);

				// Check for [feedback_incorporated] tag
				// if (chunk.includes("[feedback_incorporated]")) {
				// 	setFeedbackIncorporated(true); // Feedback incorporated
				// }

				// Extract and set search queries if found
				const searchQueriesMatch = chunk.match(
					/\[search_queries\]\s*(\[.*?\])/s
				);
				if (searchQueriesMatch) {
					try {
						const parsed = JSON.parse(searchQueriesMatch[1]);
						console.log(`search queries: ${parsed}`);
						setSearchQueries(parsed);
						setVisibleQuery(null);
					} catch (err) {
						console.warn("Failed to parse search queries:", err);
					}
				}

				// Extract and set sources if found
				const sourcesMatch = chunk.match(/\[sources\]\s*(\[.*?\])/s);
				if (sourcesMatch) {
					try {
						const parsed = JSON.parse(sourcesMatch[1]);
						setSources(parsed);
					} catch (err) {
						console.warn("Failed to parse sources:", err);
					}
				}

				// Extract output if it starts with [output]
				const outputStart = chunk.indexOf("[output]");
				if (outputStart !== -1) {
					const outputPart = chunk.slice(outputStart + "[output]".length);
					// .trim();
					if (outputPart) {
						setOutput((prev) => prev + outputPart);
					}
				} else {
					// If chunk is just plain text (output), add it
					// This handles all chunks that don't include metadata
					// const trimmed = chunk.trim();
					const trimmed = chunk;
					if (
						trimmed &&
						!trimmed.includes("[search_queries]") &&
						!trimmed.includes("[sources]") &&
						!trimmed.includes("{") &&
						!trimmed.includes("}")
					) {
						setOutput((prev) => prev + trimmed);
					}
				}

				// Smooth scroll to latest
				setTimeout(() => {
					outputRef.current?.scrollIntoView({ behavior: "smooth" });
				}, 7000);
			}
		} else {
			setIsTextAreaDisabled(true);
			setTextAreaPlaceholder(
				"Input disabled. Reload page to try another query."
			);
			sendFeedback();
		}
	};

	const sendFeedback = async () => {
		if (!sessionId || !input.trim()) return;
		await fetch(`${API_URL}/feedback`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ session_id: sessionId, feedback: input }),
		});
	};

	// const sourcesCardsUI =
	// 	sources.length > 0
	// 		? sources.map((source, index) => (
	// 				<div className="md:w-auto" key={index}>
	// 					<div className="size-full" data-state="closed" aria-label="">
	// 						<a
	// 							target="_blank"
	// 							rel="noopener"
	// 							className="group flex w-full cursor-pointer items-stretch h-full"
	// 							href={source.url}
	// 						>
	// 							<div className="w-full">
	// 								<div className="group relative flex w-full items-stretch h-full">
	// 									<div className="flex w-full rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 transition duration-300 bg-offset dark:bg-offsetDark md:hover:bg-offsetPlus md:dark:hover:bg-offsetPlusDark">
	// 										<div className="items gap-xs pointer-events-none relative flex h-full max-w-full select-none flex-col px-sm pb-sm pt-sm w-full">
	// 											<div className="flex w-full items-center justify-between">
	// 												<div className="space-x-xs flex">
	// 													<div className="flex items-center gap-x-1.5 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
	// 														<div className="relative flex-none">
	// 															<div className="relative overflow-hidden rounded-full">
	// 																<div className="rounded-inherit absolute inset-0 bg-white"></div>
	// 																<div className="rounded-inherit absolute bottom-0 left-0 right-0 top-0 border border-[black]/10 dark:border-transparent"></div>
	// 															</div>
	// 														</div>
	// 														<div className="line-clamp-1 break-all transition-all duration-300 max-w-[150px] light font-sans text-xs font-medium text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
	// 															{source.title}
	// 														</div>
	// 													</div>
	// 												</div>
	// 												<div></div>
	// 											</div>
	// 											<div className="default font-sans text-xs font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
	// 												<span className="line-clamp-1 text-left md:line-clamp-2">
	// 													{source.content.slice(0, 50)}
	// 												</span>
	// 											</div>
	// 										</div>
	// 									</div>
	// 								</div>
	// 							</div>
	// 						</a>
	// 					</div>
	// 				</div>
	// 		  ))
	// 		: null;

	// useEffect(() => {
	// 	console.log("sources updated:", sources);

	// }, [sources]);

	// useEffect(() => {
	// 	if (searchQueries.length === 0) return;

	// 	let index = 0;

	// 	const interval = setInterval(() => {
	// 		if (index < searchQueries.length) {
	// 			setVisibleQuery(searchQueries[index]);
	// 			index++;
	// 		} else {
	// 			clearInterval(interval);
	// 			// Hide after last one
	// 			setTimeout(() => setVisibleQuery(null), 600);
	// 			setTimeout(() => setVisibleQueries(searchQueries), 600);
	// 		}
	// 	}, 600);

	// 	return () => clearInterval(interval);
	// }, [searchQueries]);

	const [searchQueries, setSearchQueries] = useState<string[]>([]);
	const [visibleQuery, setVisibleQuery] = useState<string | null>(null);

	useEffect(() => {
		if (searchQueries.length === 0) return;

		let index = 0;

		const interval = setInterval(() => {
			if (index < searchQueries.length) {
				setVisibleQuery(searchQueries[index]);
				index++;
			} else {
				clearInterval(interval);
				// Hide the badge 1s after last one
				// setTimeout(() => setVisibleQuery(null), 1000);
				// setSearchingText("Searching done");

				setTimeout(() => {
					setVisibleQuery(null);
					setSearchingText("Searching done");
				}, 1000);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [searchQueries]);

	return (
		<>
			<Head>
				<link
					rel="stylesheet"
					href="https://pplx-next-static-public.perplexity.ai/_next/static/css/908b88a79b4232ac.css"
					data-precedence="next"
				/>
				<link
					rel="stylesheet"
					href="https://pplx-next-static-public.perplexity.ai/_next/static/css/2618bb79d284b2a3.css"
					data-precedence="next"
				/>
				<link
					rel="stylesheet"
					href="https://pplx-next-static-public.perplexity.ai/_next/static/css/b7e4f212ca36eff5.css"
					data-precedence="next"
				/>

				<title>Perplexity</title>
				<meta
					name="description"
					content="Perplexity is a free AI-powered answer engine that provides accurate, trusted, and real-time answers to any question."
				/>
				<meta name="robots" content="index" />
				<link rel="canonical" href="https://www.perplexity.ai" />
				<meta property="og:title" content="Perplexity" />
				<meta
					property="og:description"
					content="Perplexity is a free AI-powered answer engine that provides accurate, trusted, and real-time answers to any question."
				/>
				<meta property="og:url" content="https://www.perplexity.ai" />
				<meta property="og:site_name" content="Perplexity AI" />
				<meta property="og:locale" content="en_US" />
				<meta
					property="og:image"
					content="https://ppl-ai-public.s3.amazonaws.com/static/img/pplx-default-preview.png"
				/>
				<meta property="og:type" content="website" />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:site" content="@perplexity_ai" />
				<meta name="twitter:title" content="Perplexity" />
				<meta
					name="twitter:description"
					content="Perplexity is a free AI-powered answer engine that provides accurate, trusted, and real-time answers to any question."
				/>
				<meta
					name="twitter:image"
					content="https://ppl-ai-public.s3.amazonaws.com/static/img/pplx-default-preview.png"
				/>

				{/* <link
					rel="preload"
					as="image"
					href="https://r2cdn.perplexity.ai/windows_light_simple.jpg"
				/>
				<link
					rel="preload"
					as="image"
					href="https://r2cdn.perplexity.ai/windows_dark_simple.jpg"
				/>
				<link
					rel="preload"
					as="image"
					href="https://pplx-res.cloudinary.com/image/upload/t_thumbnail/v1744238629/getty_uploads/2209188153_e35s1k.jpg"
				/> */}
			</Head>
			<main>
				<div className="border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
					<div className="flex h-full min-h-[100dvh]">
						<div className="hidden md:block border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
							{/* side bar */}
							<div
								data-testid="sidebar"
								className="group/bar isolate transition-all duration-300 ease-in-out w-sideBarWidth"
							>
								<div className="fixed z-20 h-full transition-all duration-300 ease-in-out w-sideBarWidth border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
									<div className="sticky top-0 flex h-full min-h-0 flex-1 flex-col">
										<div className="my-md flex items-center justify-between">
											<span>
												<Link
													aria-label="Perplexity"
													className="block"
													href="/"
												>
													<div className="ml-xs pl-md pr-sm pt-xs">
														<div className="h-auto group w-28 md:w-[140px]">
															<svg
																viewBox="0 0 400 91"
																fill="none"
																xmlns="http://www.w3.org/2000/svg"
															>
																<path
																	d="M196.978 27.8931H200.033V34.1872H196.079C192.979 34.1872 190.669 34.9333 189.14 36.4254C187.615 37.9176 186.85 40.3662 186.85 43.7711V64.401H180.606V28.0333H186.85V33.8367C186.85 34.1622 187.014 34.3274 187.337 34.3274C187.52 34.3274 187.659 34.2823 187.754 34.1872C187.848 34.0921 187.938 33.9068 188.032 33.6264C189.234 29.8058 192.219 27.8931 196.983 27.8931H196.978ZM237.763 35.6894C239.402 38.6036 240.227 42.1137 240.227 46.2146C240.227 50.3156 239.407 53.8257 237.763 56.7399C236.119 59.6541 233.993 61.8323 231.38 63.2794C228.767 64.7265 225.956 65.4476 222.951 65.4476C217.03 65.4476 212.868 63.0691 210.464 58.3122C210.28 57.9417 210.046 57.7514 209.768 57.7514C209.49 57.7514 209.351 57.8916 209.351 58.172V77.6853H203.107V28.0333H209.351V34.2573C209.351 34.5377 209.49 34.6779 209.768 34.6779C210.046 34.6779 210.275 34.4926 210.464 34.1171C212.868 29.3602 217.03 26.9817 222.951 26.9817C225.956 26.9817 228.767 27.7028 231.38 29.1499C233.993 30.597 236.119 32.7751 237.763 35.6894ZM233.983 46.2146C233.983 41.9234 232.841 38.5786 230.551 36.1801C228.261 33.7816 225.246 32.5799 221.496 32.5799C217.745 32.5799 214.73 33.7816 212.44 36.1801C210.151 38.5836 209.311 41.9284 209.311 46.2146C209.311 50.5009 210.151 53.8507 212.44 56.2492C214.73 58.6527 217.75 59.8494 221.496 59.8494C225.241 59.8494 228.261 58.6477 230.551 56.2492C232.841 53.8507 233.983 50.5009 233.983 46.2146ZM134.595 35.7445C136.235 38.6587 137.059 42.1688 137.059 46.2697C137.059 50.3707 136.24 53.8808 134.595 56.795C132.951 59.7092 130.825 61.8874 128.213 63.3345C125.6 64.7816 122.788 65.5026 119.783 65.5026C113.863 65.5026 109.7 63.1242 107.296 58.3673C107.112 57.9967 106.879 57.8065 106.601 57.8065C106.322 57.8065 106.183 57.9467 106.183 58.2271V77.7404H99.9446V28.0883H106.188V34.3124C106.188 34.5928 106.327 34.733 106.606 34.733C106.884 34.733 107.112 34.5477 107.301 34.1722C109.705 29.4153 113.867 27.0368 119.788 27.0368C122.793 27.0368 125.605 27.7579 128.218 29.205C130.83 30.6521 132.956 32.8302 134.6 35.7445H134.595ZM130.815 46.2697C130.815 41.9785 129.673 38.6336 127.383 36.2352C125.093 33.8367 122.078 32.6349 118.328 32.6349C114.578 32.6349 111.563 33.8367 109.273 36.2352C106.983 38.6387 106.144 41.9835 106.144 46.2697C106.144 50.5559 106.983 53.9058 109.273 56.3043C111.563 58.7078 114.578 59.9045 118.328 59.9045C122.078 59.9045 125.093 58.7028 127.383 56.3043C129.673 53.9058 130.815 50.5559 130.815 46.2697ZM169.112 52.8543H175.703C174.824 56.2592 173.031 59.2085 170.329 61.7021C167.622 64.1957 163.748 65.4425 158.706 65.4425C154.911 65.4425 151.573 64.6614 148.682 63.0991C145.791 61.5369 143.561 59.3137 141.986 56.4195C140.412 53.5303 139.627 50.1253 139.627 46.2096C139.627 42.294 140.392 38.889 141.917 35.9998C143.442 33.1106 145.583 30.8824 148.335 29.3201C151.086 27.7579 154.31 26.9767 158.011 26.9767C161.711 26.9767 164.776 27.7479 167.344 29.2851C169.912 30.8223 171.829 32.8653 173.101 35.404C174.372 37.9477 175.008 40.7317 175.008 43.7611V47.9572H146.219C146.447 51.5925 147.664 54.4867 149.859 56.6298C152.055 58.7729 155.005 59.8494 158.706 59.8494C161.711 59.8494 164.016 59.2335 165.61 57.9967C167.205 56.7599 168.372 55.0475 169.112 52.8543ZM146.288 42.7146H168.074C168.074 39.545 167.264 37.0614 165.645 35.2638C164.026 33.4712 161.483 32.5699 158.015 32.5699C154.777 32.5699 152.129 33.4461 150.073 35.1937C148.017 36.9412 146.755 39.4498 146.293 42.7096L146.288 42.7146ZM245.169 64.396H251.413V14.043H245.169V64.401V64.396ZM331.801 24.0625H339.093V16.1911H331.801V24.0625ZM357.526 58.9782C356.393 59.0933 355.708 59.1534 355.479 59.1534C355.156 59.1534 354.898 59.0583 354.714 58.873C354.531 58.6877 354.436 58.4324 354.436 58.1019C354.436 57.8716 354.496 57.1806 354.61 56.0389C354.724 54.8972 354.784 53.1347 354.784 50.7612V33.361H363.69L361.937 28.0333H354.789V18.2391H348.545V28.0283H341.755V33.356H348.545V52.5038C348.545 56.5146 349.519 59.4989 351.461 61.4568C353.403 63.4146 356.363 64.396 360.342 64.396H365.2V58.8029H362.771C360.412 58.8029 358.663 58.863 357.531 58.9782H357.526ZM394.059 28.0283L383.723 58.5425C383.583 58.9181 383.365 59.4088 382.655 59.4088C381.944 59.4088 381.726 58.9181 381.587 58.5425L371.25 28.0283H364.882L376.853 64.396H381.085C381.363 64.396 381.572 64.4211 381.711 64.4661C381.85 64.5112 381.964 64.6264 382.059 64.8166C382.242 65.097 382.217 65.5177 381.989 66.0735L380.047 71.3862C379.769 72.0872 379.237 72.4377 378.452 72.4377C378.174 72.4377 377.529 72.3776 376.51 72.2624C375.492 72.1473 374.176 72.0872 372.556 72.0872H367.49V77.6803H374.151C378.035 77.6803 380.375 77.0143 382.386 75.6874C384.398 74.3605 385.958 72.0171 387.07 68.6572L400 29.4203V28.0233H394.059V28.0283ZM311.406 41.5979L301.626 28.0283H294.756V29.4253L306.478 45.1631L292.188 62.999V64.396H299.197L310.576 49.7798L321.191 64.396H327.922V62.999L315.504 46.2146L328.965 29.5004V28.0333H321.956L311.411 41.603L311.406 41.5979ZM332.467 64.396H338.71V28.0333H332.467V64.401V64.396ZM292.471 52.8543C291.592 56.2592 289.799 59.2085 287.097 61.7021C284.39 64.1957 280.515 65.4425 275.474 65.4425C271.679 65.4425 268.341 64.6614 265.45 63.0991C262.559 61.5369 260.329 59.3137 258.754 56.4195C257.18 53.5303 256.395 50.1253 256.395 46.2096C256.395 42.294 257.16 38.889 258.685 35.9998C260.21 33.1106 262.35 30.8824 265.102 29.3201C267.854 27.7579 271.078 26.9767 274.778 26.9767C278.479 26.9767 281.543 27.7479 284.111 29.2851C286.679 30.8223 288.597 32.8653 289.868 35.404C291.14 37.9477 291.776 40.7317 291.776 43.7611V47.9572H262.986C263.215 51.5925 264.432 54.4867 266.627 56.6298C268.823 58.7729 271.773 59.8494 275.474 59.8494C278.479 59.8494 280.783 59.2335 282.378 57.9967C283.972 56.7599 285.14 55.0475 285.88 52.8543H292.471ZM263.056 42.7146H284.842C284.842 39.545 284.032 37.0614 282.413 35.2638C280.793 33.4712 278.25 32.5699 274.783 32.5699C271.545 32.5699 268.897 33.4461 266.841 35.1937C264.784 36.9412 263.523 39.4498 263.061 42.7096L263.056 42.7146Z"
																	className="block fill-textMain dark:fill-textMainDark group-hover:fill-superDuper transition-colors duration-300"
																></path>
																<path
																	d="M38.6936 29.9832L12.8633 5.88983V29.9832H38.6936Z"
																	className="stroke-super dark:stroke-superDark group-hover:stroke-superDuper transition-colors duration-300 transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M39.5005 29.9832L65.3308 5.88983V29.9832H39.5005Z"
																	className="stroke-super dark:stroke-superDark group-hover:stroke-superDuper transition-colors duration-300 transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M38.7227 2L38.7227 90.2534"
																	className="stroke-super dark:stroke-superDark group-hover:stroke-superDuper transition-colors duration-300 transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M64.5246 53.7584L38.6943 30.0068V62.9404L64.5246 85.9724V53.7584Z"
																	className="stroke-super dark:stroke-superDark group-hover:stroke-superDuper transition-colors duration-300 transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M12.8924 53.7584L38.7227 30.0068V62.9404L12.8924 85.9724V53.7584Z"
																	className="stroke-super dark:stroke-superDark group-hover:stroke-superDuper transition-colors duration-300 transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M2.28711 29.9832V64.4236H12.8863V53.7348L38.7226 29.9832H2.28711Z"
																	className="stroke-super dark:stroke-superDark group-hover:stroke-superDuper transition-colors duration-300 transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M38.6943 30.3L64.5246 54.0515V64.7403H75.2872V30.3L38.6943 30.3Z"
																	className="stroke-super dark:stroke-superDark group-hover:stroke-superDuper transition-colors duration-300 transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
															</svg>
														</div>
													</div>
												</Link>
											</span>
											<div className="mr-xs pt-two">
												<button
													aria-label="Collapse"
													type="button"
													className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
													data-state="closed"
												>
													<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
														<div className="flex shrink-0 items-center justify-center size-4">
															<svg
																aria-hidden="true"
																focusable="false"
																data-prefix="far"
																data-icon="arrow-left-to-line"
																className="svg-inline--fa fa-arrow-left-to-line fa-fw fa-1x"
																role="img"
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 448 512"
															>
																<path
																	fill="currentColor"
																	d="M0 424c0 13.3 10.7 24 24 24s24-10.7 24-24L48 88c0-13.3-10.7-24-24-24S0 74.7 0 88L0 424zM135.6 238.5c-4.8 4.5-7.6 10.9-7.6 17.5s2.7 12.9 7.6 17.5l136 128c9.7 9.1 24.8 8.6 33.9-1s8.6-24.8-1-33.9L212.5 280l83.5 0 128 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-128 0-83.5 0 91.9-86.5c9.7-9.1 10.1-24.3 1-33.9s-24.3-10.1-33.9-1l-136 128z"
																></path>
															</svg>
														</div>
													</div>
												</button>
											</div>
										</div>
										<div className="pt-sm">
											<div className="ml-xs">
												<div className="mx-md py-sm pl-md pr-sm hover:ring-super dark:hover:ring-superDark group flex flex-none cursor-pointer select-none items-center justify-between rounded-full border ring-1 ring-transparent transition duration-200 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-background dark:bg-backgroundDark">
													<div className="line-clamp-1 overflow-hidden text-clip light font-sans text-sm font-medium leading-[1.125rem] text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
														New Thread
													</div>
													<div className="flex items-center gap-0 whitespace-nowrap light font-sans text-xs font-medium text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
														<div className="flex items-center justify-center rounded border font-mono text-xs px-xs h-3.5 min-w-3.5 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
															Ctrl
														</div>
														<div className="flex items-center justify-center rounded border font-mono text-xs px-xs h-3.5 min-w-3.5 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
															⇧
														</div>
														<div className="flex items-center justify-center rounded border font-mono text-xs px-xs h-3.5 min-w-3.5 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
															P
														</div>
													</div>
												</div>
											</div>
										</div>
										<div className="pt-md scrollbar-thin scrollbar-track-transparent scrollbar-thumb-idle dark:scrollbar-thumb-idleDark min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
											<div className="w-full">
												<div className="items-center relative flex-1 w-full">
													<div className="flex w-full">
														<div className="items-center relative overflow-x-auto scrollbar-none flex-1 space-y-xs">
															<div className="relative justify-center w-full border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																<div className="px-xs transition duration-300 relative flex items-center">
																	<Link
																		role="button"
																		aria-label="Home"
																		className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textMain dark:text-textMainDark dark:hover:bg-offsetPlusDark py-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-start rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap flex w-full text-base h-10 pl-3 pr-4"
																		style={{
																			WebkitTapHighlightColor: "transparent",
																		}}
																		href="/"
																	>
																		<div className="flex items-center min-w-0 font-medium gap-1.5 justify-left w-full">
																			<div className="flex shrink-0 items-center justify-center size-5">
																				<svg
																					aria-hidden="true"
																					focusable="false"
																					data-prefix="fak"
																					data-icon="search"
																					className="svg-inline--fa fa-search fa-fw fa-1x"
																					role="img"
																					xmlns="http://www.w3.org/2000/svg"
																					viewBox="0 0 512 512"
																				>
																					<path
																						fill="currentColor"
																						d="M236.8 288a51.2 51.2 0 1 0 0-102.4 51.2 51.2 0 1 0 0 102.4zM434.9 398.7c-10.9 13.1-23 25.3-36.2 36.2l68.5 68.5 36.2-36.2-68.5-68.5zM236.8 32a204.8 204.8 0 1 1 0 409.6 204.8 204.8 0 1 1 0-409.6zm0 51.2a153.6 153.6 0 1 0 0 307.2 153.6 153.6 0 1 0 0-307.2z"
																					></path>
																				</svg>
																			</div>
																			<div className="text-align-center relative truncate leading-loose -mb-[2px]">
																				Home
																			</div>
																		</div>
																	</Link>
																	<div className="absolute bg-textMain dark:bg-textMainDark"></div>
																</div>
															</div>
															<div className="relative justify-center w-full border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																<div className="px-xs transition duration-300 relative">
																	<a
																		role="button"
																		aria-label="Discover"
																		className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark py-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-start rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap flex w-full text-base h-10 pl-3 pr-4"
																		style={{
																			WebkitTapHighlightColor: "transparent",
																		}}
																		href="/discover"
																	>
																		<div className="flex items-center min-w-0 font-medium gap-1.5 justify-left w-full">
																			<div className="flex shrink-0 items-center justify-center size-5">
																				<svg
																					aria-hidden="true"
																					focusable="false"
																					data-prefix="fak"
																					data-icon="discover"
																					className="svg-inline--fa fa-discover fa-fw fa-1x"
																					role="img"
																					xmlns="http://www.w3.org/2000/svg"
																					viewBox="0 0 640 512"
																				>
																					<path
																						fill="currentColor"
																						d="M320 51.2c6.4 0 19.2 17.3 30.4 51.2c4.8 14.1 9 31.4 12.5 51.2c2.9 15.4 5.1 32.3 6.4 51.2c1.3 16 1.9 33 1.9 51.2h51.2c0-17-.6-34.2-1.9-51.2c-1.3-17.3-3.2-34.6-5.8-51.2c-2.9-17.9-6.4-35.2-10.9-51.2c-3.8-13.8-8-26.6-13.1-38.4C374.1 25.3 350.7 0 320 0s-54.1 25.3-70.7 64c-5.1 11.5-9.3 24.6-13.1 38.4h53.8c11.2-33.9 23.7-51.2 30.4-51.2H320zm0 409.6c-6.4 0-19.2-17.3-30.4-51.2c-4.8-14.1-9-31.4-12.5-51.2c-2.9-15.4-5.1-32.3-6.4-51.2c-1.3-16-1.9-33-1.9-51.2H217.6c0 17 .6 34.2 1.9 51.2c1.3 17.3 3.2 34.6 5.8 51.2c2.9 17.9 6.4 35.2 10.9 51.2c3.8 13.8 8 26.6 13.1 38.4c16.6 38.7 40 64 70.7 64s54.1-25.3 70.7-64c5.1-11.5 9.3-24.6 13.1-38.4H350.1c-11.2 33.9-23.7 51.2-30.4 51.2h.3zM550.4 145.3c-7.4-15-16-29.4-26.2-42.9c-25-33-57.6-59.8-95.4-77.8C395.8 9 359 0 320 0s-75.8 9-108.8 24.6c-37.8 17.9-70.4 44.8-95.4 77.8c-9.9 13.4-18.9 27.5-26.2 42.9C73.3 178.9 64 216.3 64 256s9.3 77.1 25.6 110.7c7.4 15 16 29.4 26.2 42.9c25 33 57.6 59.8 95.4 77.8C244.2 503 281 512 320 512s75.8-9 108.8-24.6c37.8-17.9 70.4-44.8 95.4-77.8c9.9-13.4 18.9-27.5 26.2-42.9c16.3-33.6 25.6-71 25.6-110.7s-9.3-77.1-25.6-110.7zM390.7 448c-22.1 8.3-45.8 12.8-70.7 12.8s-48.6-4.8-70.7-12.8c-23.7-9-45.4-21.8-64.3-38.4c-1-.6-1.6-1.6-2.6-2.2c-15.7-14.1-29.1-30.7-39.7-49h30.4c-2.2-16.6-4.2-33.9-5.1-51.2H121.9c-4.2-16.3-6.7-33.6-6.7-51.2s2.6-34.9 6.7-51.2H320V153.6H143c10.6-18.2 24-34.9 39.7-49c1-.6 1.6-1.6 2.6-2.2C204.2 86.1 225.6 73 249.6 64c22.1-8.3 45.8-12.8 70.7-12.8s48.6 4.8 70.7 12.8c23.7 9 45.4 21.8 64.3 38.4c1 .6 1.6 1.6 2.6 2.2c15.7 14.1 29.1 30.7 39.7 49H467.2c2.2 16.6 4.2 33.9 5.1 51.2h46.1c4.2 16.3 6.7 33.6 6.7 51.2s-2.6 34.9-6.7 51.2H320.3v51.2h177c-10.6 18.2-24 34.9-39.7 49c-1 .6-1.6 1.6-2.6 2.2c-18.9 16.3-40.3 29.4-64.3 38.4z"
																					></path>
																				</svg>
																			</div>
																			<div className="text-align-center relative truncate leading-loose -mb-[2px]">
																				Discover
																			</div>
																		</div>
																	</a>
																</div>
															</div>
															<div className="relative justify-center w-full border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																<div className="px-xs transition duration-300 relative">
																	<a
																		role="button"
																		aria-label="Spaces"
																		className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark py-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-start rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap flex w-full text-base h-10 pl-3 pr-4"
																		style={{
																			WebkitTapHighlightColor: "transparent",
																		}}
																		href="/spaces"
																	>
																		<div className="flex items-center min-w-0 font-medium gap-1.5 justify-left w-full">
																			<div className="flex shrink-0 items-center justify-center size-5">
																				<svg
																					aria-hidden="true"
																					focusable="false"
																					data-prefix="fak"
																					data-icon="collection-2"
																					className="svg-inline--fa fa-collection-2 fa-fw fa-1x"
																					role="img"
																					xmlns="http://www.w3.org/2000/svg"
																					viewBox="0 0 512 512"
																				>
																					<path
																						fill="currentColor"
																						d="M32 236.8V185.6c84.8 0 153.6-68.8 153.6-153.6h51.2C236.8 145 145 236.8 32 236.8zm460.8 0C379.8 236.8 288 145 288 32h51.2c0 84.8 68.8 153.6 153.6 153.6v51.2zm-256 256H185.6c0-84.8-68.8-153.6-153.6-153.6V288c113 0 204.8 91.8 204.8 204.8zm102.4 0H288c0-113 91.8-204.8 204.8-204.8v51.2c-84.8 0-153.6 68.8-153.6 153.6zM262.4 313.6a51.2 51.2 0 1 0 0-102.4 51.2 51.2 0 1 0 0 102.4z"
																					></path>
																				</svg>
																			</div>
																			<div className="text-align-center relative truncate leading-loose -mb-[2px]">
																				Spaces
																			</div>
																		</div>
																	</a>
																</div>
															</div>
															<div className="relative justify-center w-full border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																<div className="px-xs transition duration-300 relative">
																	<a
																		role="button"
																		aria-label="Library"
																		className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark py-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-start rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap flex w-full text-base h-10 pl-3 pr-4"
																		style={{
																			WebkitTapHighlightColor: "transparent",
																		}}
																		href="/library"
																	>
																		<div className="flex items-center min-w-0 font-medium gap-1.5 justify-left w-full">
																			<div className="flex shrink-0 items-center justify-center size-5">
																				<svg
																					aria-hidden="true"
																					focusable="false"
																					data-prefix="fak"
																					data-icon="library"
																					className="svg-inline--fa fa-library fa-fw fa-1x"
																					role="img"
																					xmlns="http://www.w3.org/2000/svg"
																					viewBox="0 0 512 512"
																				>
																					<path
																						fill="currentColor"
																						d="M512 281.6H460.8V256C460.8 143 369 51.2 256 51.2S51.2 143 51.2 256v25.6H0V256C0 114.9 114.9 0 256 0S512 114.9 512 256v25.6zm-102.4 0H358.4V256c0-56.3-46.1-102.4-102.4-102.4s-102.4 46.1-102.4 102.4v25.6H102.4V256c0-84.8 68.8-153.6 153.6-153.6s153.6 68.8 153.6 153.6v25.6zm-51.2 51.2c-41.9 0-79 20.5-102.4 51.8c-23.4-31.4-60.5-51.8-102.4-51.8H0V384H153.6c42.2 0 76.8 34.6 76.8 76.8v25.6h51.2V460.8c0-42.2 34.6-76.8 76.8-76.8H512V332.8H358.4zM256 307.2a51.2 51.2 0 1 0 0-102.4 51.2 51.2 0 1 0 0 102.4z"
																					></path>
																				</svg>
																			</div>
																			<div className="text-align-center relative truncate leading-loose -mb-[2px]">
																				Library
																			</div>
																		</div>
																	</a>
																</div>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
										<div className="flex flex-col">
											<div className="gap-md flex flex-col">
												<div className="hidden [@media(min-height:670px)]:block">
													<div className="opacity-0 transition-opacity duration-300 ease-in-out [@media(min-height:700px)]:opacity-100"></div>
												</div>
												<div>
													<div>
														<div className="py-sm w-full border-t border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
															<div className="mx-sm gap-xs flex items-center justify-between border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																<span className="inline-flex min-w-0">
																	<div className="gap-sm pr-sm inline-flex w-full cursor-pointer select-none items-center justify-start rounded-full p-1 transition !duration-150 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 transition duration-300 bg-offset dark:bg-offsetDark md:hover:bg-offsetPlus md:dark:hover:bg-offsetPlusDark">
																		<div className="relative">
																			<div className="relative flex aspect-square shrink-0 items-center justify-center rounded-full h-8 w-8 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offsetPlus dark:bg-offsetPlusDark">
																				<div className="light font-sans text-base text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					<svg
																						aria-hidden="true"
																						focusable="false"
																						data-prefix="fas"
																						data-icon="user"
																						className="svg-inline--fa fa-user fa-fw fa-1x"
																						role="img"
																						xmlns="http://www.w3.org/2000/svg"
																						viewBox="0 0 448 512"
																					>
																						<path
																							fill="currentColor"
																							d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"
																						></path>
																					</svg>
																				</div>
																			</div>
																		</div>
																		<div className="gap-x-xs relative flex items-center">
																			<div className="line-clamp-1 break-all default font-sans text-sm font-medium leading-[1.125rem] text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																				Sushaanth
																			</div>
																		</div>
																		<span className="text-background dark:text-backgroundDark relative top-[1px] opacity-50 !dark:text-textOff !text-textOff !opacity-100">
																			<svg
																				aria-hidden="true"
																				focusable="false"
																				data-prefix="far"
																				data-icon="chevron-down"
																				className="svg-inline--fa fa-chevron-down fa-xs"
																				role="img"
																				xmlns="http://www.w3.org/2000/svg"
																				viewBox="0 0 512 512"
																			>
																				<path
																					fill="currentColor"
																					d="M239 401c9.4 9.4 24.6 9.4 33.9 0L465 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-175 175L81 175c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9L239 401z"
																				></path>
																			</svg>
																		</span>
																	</div>
																</span>
																<button
																	aria-label="Settings"
																	type="button"
																	className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark aspect-square min-h-[unset] shrink-0 h-[32px] -mr-xs font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																	data-state="closed"
																>
																	<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																		<div className="flex shrink-0 items-center justify-center size-4">
																			<svg
																				aria-hidden="true"
																				focusable="false"
																				data-prefix="far"
																				data-icon="gear"
																				className="svg-inline--fa fa-gear fa-fw fa-1x"
																				role="img"
																				xmlns="http://www.w3.org/2000/svg"
																				viewBox="0 0 512 512"
																			>
																				<path
																					fill="currentColor"
																					d="M256 0c17 0 33.6 1.7 49.8 4.8c7.9 1.5 21.8 6.1 29.4 20.1c2 3.7 3.6 7.6 4.6 11.8l9.3 38.5C350.5 81 360.3 86.7 366 85l38-11.2c4-1.2 8.1-1.8 12.2-1.9c16.1-.5 27 9.4 32.3 15.4c22.1 25.1 39.1 54.6 49.9 86.3c2.6 7.6 5.6 21.8-2.7 35.4c-2.2 3.6-4.9 7-8 10L459 246.3c-4.2 4-4.2 15.5 0 19.5l28.7 27.3c3.1 3 5.8 6.4 8 10c8.2 13.6 5.2 27.8 2.7 35.4c-10.8 31.7-27.8 61.1-49.9 86.3c-5.3 6-16.3 15.9-32.3 15.4c-4.1-.1-8.2-.8-12.2-1.9L366 427c-5.7-1.7-15.5 4-16.9 9.8l-9.3 38.5c-1 4.2-2.6 8.2-4.6 11.8c-7.7 14-21.6 18.5-29.4 20.1C289.6 510.3 273 512 256 512s-33.6-1.7-49.8-4.8c-7.9-1.5-21.8-6.1-29.4-20.1c-2-3.7-3.6-7.6-4.6-11.8l-9.3-38.5c-1.4-5.8-11.2-11.5-16.9-9.8l-38 11.2c-4 1.2-8.1 1.8-12.2 1.9c-16.1 .5-27-9.4-32.3-15.4c-22-25.1-39.1-54.6-49.9-86.3c-2.6-7.6-5.6-21.8 2.7-35.4c2.2-3.6 4.9-7 8-10L53 265.7c4.2-4 4.2-15.5 0-19.5L24.2 218.9c-3.1-3-5.8-6.4-8-10C8 195.3 11 181.1 13.6 173.6c10.8-31.7 27.8-61.1 49.9-86.3c5.3-6 16.3-15.9 32.3-15.4c4.1 .1 8.2 .8 12.2 1.9L146 85c5.7 1.7 15.5-4 16.9-9.8l9.3-38.5c1-4.2 2.6-8.2 4.6-11.8c7.7-14 21.6-18.5 29.4-20.1C222.4 1.7 239 0 256 0zM218.1 51.4l-8.5 35.1c-7.8 32.3-45.3 53.9-77.2 44.6L97.9 120.9c-16.5 19.3-29.5 41.7-38 65.7l26.2 24.9c24 22.8 24 66.2 0 89L59.9 325.4c8.5 24 21.5 46.4 38 65.7l34.6-10.2c31.8-9.4 69.4 12.3 77.2 44.6l8.5 35.1c24.6 4.5 51.3 4.5 75.9 0l8.5-35.1c7.8-32.3 45.3-53.9 77.2-44.6l34.6 10.2c16.5-19.3 29.5-41.7 38-65.7l-26.2-24.9c-24-22.8-24-66.2 0-89l26.2-24.9c-8.5-24-21.5-46.4-38-65.7l-34.6 10.2c-31.8 9.4-69.4-12.3-77.2-44.6l-8.5-35.1c-24.6-4.5-51.3-4.5-75.9 0zM208 256a48 48 0 1 0 96 0 48 48 0 1 0 -96 0zm48 96a96 96 0 1 1 0-192 96 96 0 1 1 0 192z"
																				></path>
																			</svg>
																		</div>
																	</div>
																</button>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="erp-tab:p-0 erp-new_tab:p-0 md:gap-xs lg:pb-sm lg:pr-sm lg:pt-sm isolate flex h-auto max-h-screen w-full min-w-0 grow flex-col">
							<div className="erp-tab:rounded-none erp-new_tab:rounded-none erp-tab:shadow-none erp-new_tab:shadow-none erp-tab:shadow-left-sm erp-new_tab:shadow-left-sm relative isolate flex-1 overflow-clip bg-clip-border shadow-sm lg:rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-background dark:bg-backgroundDark">
								<div className="max-w-screen md:max-w-auto mx-auto flex w-full flex-col h-full">
									<div className="scrollable-container scrollbar-thin scrollbar-track-transparent scrollbar-thumb-idle dark:scrollbar-thumb-idleDark flex flex-1 basis-0 overflow-auto [scrollbar-gutter:stable]">
										<div className="mx-auto size-full max-w-screen-md px-md md:px-lg">
											<div className="erp-sidecar:px-md sm:px-md md:px-lg isolate mx-auto size-full sm:max-w-screen-md">
												<div className="relative flex h-full flex-col">
													<div className="py-md flex items-center justify-between border-b md:hidden border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
														<div className="h-auto group w-40 md:w-52">
															<svg
																viewBox="0 0 400 91"
																fill="none"
																xmlns="http://www.w3.org/2000/svg"
															>
																<path
																	d="M196.978 27.8931H200.033V34.1872H196.079C192.979 34.1872 190.669 34.9333 189.14 36.4254C187.615 37.9176 186.85 40.3662 186.85 43.7711V64.401H180.606V28.0333H186.85V33.8367C186.85 34.1622 187.014 34.3274 187.337 34.3274C187.52 34.3274 187.659 34.2823 187.754 34.1872C187.848 34.0921 187.938 33.9068 188.032 33.6264C189.234 29.8058 192.219 27.8931 196.983 27.8931H196.978ZM237.763 35.6894C239.402 38.6036 240.227 42.1137 240.227 46.2146C240.227 50.3156 239.407 53.8257 237.763 56.7399C236.119 59.6541 233.993 61.8323 231.38 63.2794C228.767 64.7265 225.956 65.4476 222.951 65.4476C217.03 65.4476 212.868 63.0691 210.464 58.3122C210.28 57.9417 210.046 57.7514 209.768 57.7514C209.49 57.7514 209.351 57.8916 209.351 58.172V77.6853H203.107V28.0333H209.351V34.2573C209.351 34.5377 209.49 34.6779 209.768 34.6779C210.046 34.6779 210.275 34.4926 210.464 34.1171C212.868 29.3602 217.03 26.9817 222.951 26.9817C225.956 26.9817 228.767 27.7028 231.38 29.1499C233.993 30.597 236.119 32.7751 237.763 35.6894ZM233.983 46.2146C233.983 41.9234 232.841 38.5786 230.551 36.1801C228.261 33.7816 225.246 32.5799 221.496 32.5799C217.745 32.5799 214.73 33.7816 212.44 36.1801C210.151 38.5836 209.311 41.9284 209.311 46.2146C209.311 50.5009 210.151 53.8507 212.44 56.2492C214.73 58.6527 217.75 59.8494 221.496 59.8494C225.241 59.8494 228.261 58.6477 230.551 56.2492C232.841 53.8507 233.983 50.5009 233.983 46.2146ZM134.595 35.7445C136.235 38.6587 137.059 42.1688 137.059 46.2697C137.059 50.3707 136.24 53.8808 134.595 56.795C132.951 59.7092 130.825 61.8874 128.213 63.3345C125.6 64.7816 122.788 65.5026 119.783 65.5026C113.863 65.5026 109.7 63.1242 107.296 58.3673C107.112 57.9967 106.879 57.8065 106.601 57.8065C106.322 57.8065 106.183 57.9467 106.183 58.2271V77.7404H99.9446V28.0883H106.188V34.3124C106.188 34.5928 106.327 34.733 106.606 34.733C106.884 34.733 107.112 34.5477 107.301 34.1722C109.705 29.4153 113.867 27.0368 119.788 27.0368C122.793 27.0368 125.605 27.7579 128.218 29.205C130.83 30.6521 132.956 32.8302 134.6 35.7445H134.595ZM130.815 46.2697C130.815 41.9785 129.673 38.6336 127.383 36.2352C125.093 33.8367 122.078 32.6349 118.328 32.6349C114.578 32.6349 111.563 33.8367 109.273 36.2352C106.983 38.6387 106.144 41.9835 106.144 46.2697C106.144 50.5559 106.983 53.9058 109.273 56.3043C111.563 58.7078 114.578 59.9045 118.328 59.9045C122.078 59.9045 125.093 58.7028 127.383 56.3043C129.673 53.9058 130.815 50.5559 130.815 46.2697ZM169.112 52.8543H175.703C174.824 56.2592 173.031 59.2085 170.329 61.7021C167.622 64.1957 163.748 65.4425 158.706 65.4425C154.911 65.4425 151.573 64.6614 148.682 63.0991C145.791 61.5369 143.561 59.3137 141.986 56.4195C140.412 53.5303 139.627 50.1253 139.627 46.2096C139.627 42.294 140.392 38.889 141.917 35.9998C143.442 33.1106 145.583 30.8824 148.335 29.3201C151.086 27.7579 154.31 26.9767 158.011 26.9767C161.711 26.9767 164.776 27.7479 167.344 29.2851C169.912 30.8223 171.829 32.8653 173.101 35.404C174.372 37.9477 175.008 40.7317 175.008 43.7611V47.9572H146.219C146.447 51.5925 147.664 54.4867 149.859 56.6298C152.055 58.7729 155.005 59.8494 158.706 59.8494C161.711 59.8494 164.016 59.2335 165.61 57.9967C167.205 56.7599 168.372 55.0475 169.112 52.8543ZM146.288 42.7146H168.074C168.074 39.545 167.264 37.0614 165.645 35.2638C164.026 33.4712 161.483 32.5699 158.015 32.5699C154.777 32.5699 152.129 33.4461 150.073 35.1937C148.017 36.9412 146.755 39.4498 146.293 42.7096L146.288 42.7146ZM245.169 64.396H251.413V14.043H245.169V64.401V64.396ZM331.801 24.0625H339.093V16.1911H331.801V24.0625ZM357.526 58.9782C356.393 59.0933 355.708 59.1534 355.479 59.1534C355.156 59.1534 354.898 59.0583 354.714 58.873C354.531 58.6877 354.436 58.4324 354.436 58.1019C354.436 57.8716 354.496 57.1806 354.61 56.0389C354.724 54.8972 354.784 53.1347 354.784 50.7612V33.361H363.69L361.937 28.0333H354.789V18.2391H348.545V28.0283H341.755V33.356H348.545V52.5038C348.545 56.5146 349.519 59.4989 351.461 61.4568C353.403 63.4146 356.363 64.396 360.342 64.396H365.2V58.8029H362.771C360.412 58.8029 358.663 58.863 357.531 58.9782H357.526ZM394.059 28.0283L383.723 58.5425C383.583 58.9181 383.365 59.4088 382.655 59.4088C381.944 59.4088 381.726 58.9181 381.587 58.5425L371.25 28.0283H364.882L376.853 64.396H381.085C381.363 64.396 381.572 64.4211 381.711 64.4661C381.85 64.5112 381.964 64.6264 382.059 64.8166C382.242 65.097 382.217 65.5177 381.989 66.0735L380.047 71.3862C379.769 72.0872 379.237 72.4377 378.452 72.4377C378.174 72.4377 377.529 72.3776 376.51 72.2624C375.492 72.1473 374.176 72.0872 372.556 72.0872H367.49V77.6803H374.151C378.035 77.6803 380.375 77.0143 382.386 75.6874C384.398 74.3605 385.958 72.0171 387.07 68.6572L400 29.4203V28.0233H394.059V28.0283ZM311.406 41.5979L301.626 28.0283H294.756V29.4253L306.478 45.1631L292.188 62.999V64.396H299.197L310.576 49.7798L321.191 64.396H327.922V62.999L315.504 46.2146L328.965 29.5004V28.0333H321.956L311.411 41.603L311.406 41.5979ZM332.467 64.396H338.71V28.0333H332.467V64.401V64.396ZM292.471 52.8543C291.592 56.2592 289.799 59.2085 287.097 61.7021C284.39 64.1957 280.515 65.4425 275.474 65.4425C271.679 65.4425 268.341 64.6614 265.45 63.0991C262.559 61.5369 260.329 59.3137 258.754 56.4195C257.18 53.5303 256.395 50.1253 256.395 46.2096C256.395 42.294 257.16 38.889 258.685 35.9998C260.21 33.1106 262.35 30.8824 265.102 29.3201C267.854 27.7579 271.078 26.9767 274.778 26.9767C278.479 26.9767 281.543 27.7479 284.111 29.2851C286.679 30.8223 288.597 32.8653 289.868 35.404C291.14 37.9477 291.776 40.7317 291.776 43.7611V47.9572H262.986C263.215 51.5925 264.432 54.4867 266.627 56.6298C268.823 58.7729 271.773 59.8494 275.474 59.8494C278.479 59.8494 280.783 59.2335 282.378 57.9967C283.972 56.7599 285.14 55.0475 285.88 52.8543H292.471ZM263.056 42.7146H284.842C284.842 39.545 284.032 37.0614 282.413 35.2638C280.793 33.4712 278.25 32.5699 274.783 32.5699C271.545 32.5699 268.897 33.4461 266.841 35.1937C264.784 36.9412 263.523 39.4498 263.061 42.7096L263.056 42.7146Z"
																	className="block fill-textMain dark:fill-textMainDark"
																></path>
																<path
																	d="M38.6936 29.9832L12.8633 5.88983V29.9832H38.6936Z"
																	className="stroke-super dark:stroke-superDark transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M39.5005 29.9832L65.3308 5.88983V29.9832H39.5005Z"
																	className="stroke-super dark:stroke-superDark transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M38.7227 2L38.7227 90.2534"
																	className="stroke-super dark:stroke-superDark transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M64.5246 53.7584L38.6943 30.0068V62.9404L64.5246 85.9724V53.7584Z"
																	className="stroke-super dark:stroke-superDark transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M12.8924 53.7584L38.7227 30.0068V62.9404L12.8924 85.9724V53.7584Z"
																	className="stroke-super dark:stroke-superDark transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M2.28711 29.9832V64.4236H12.8863V53.7348L38.7226 29.9832H2.28711Z"
																	className="stroke-super dark:stroke-superDark transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
																<path
																	d="M38.6943 30.3L64.5246 54.0515V64.7403H75.2872V30.3L38.6943 30.3Z"
																	className="stroke-super dark:stroke-superDark transition-all duration-300"
																	strokeWidth="4.30504"
																	strokeMiterlimit="10"
																></path>
															</svg>
														</div>
														<div className="gap-x-sm flex items-center">
															<a href="/account/details">
																<div className="relative">
																	<div className="relative flex aspect-square shrink-0 items-center justify-center rounded-full h-8 w-8 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offsetPlus dark:bg-offsetPlusDark">
																		<div className="light font-sans text-base text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			<svg
																				aria-hidden="true"
																				focusable="false"
																				data-prefix="fas"
																				data-icon="user"
																				className="svg-inline--fa fa-user fa-fw fa-1x"
																				role="img"
																				xmlns="http://www.w3.org/2000/svg"
																				viewBox="0 0 448 512"
																			>
																				<path
																					fill="currentColor"
																					d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"
																				></path>
																			</svg>
																		</div>
																	</div>
																</div>
															</a>
														</div>
													</div>
													<div className="mt-lg static w-full grow flex-col items-center justify-center md:mt-0 md:flex z-10 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
														{/* query text container*/}
														<div className="max-w-threadContentWidth relative z-20 mx-auto w-full">
															<div>
																<div className="relative z-10">
																	<div className="mt-md md:mt-lg group relative mb-1 flex items-end gap-0.5 md:mb-6">
																		<div className="-inset-md absolute"></div>
																		<div className="flex-1">
																			<div className="group/title relative inline-flex flex-col">
																				<div className="overflow-hidden">
																					{/* query text */}
																					<h1 className="w-full group/query relative whitespace-pre-line break-words [word-break:break-word] max-h-[144px] default font-display text-lg md:text-xl font-[500] text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																						{/* Give me a report on the rise and
																						implications of AI-generated
																						influencers on social media */}
																						{/* {input} */}
																						{heading}
																					</h1>
																					<div className="text-background-100 pointer-events-none absolute bottom-0 left-0 right-0 h-1/4 transition-opacity duration-100"></div>
																				</div>
																			</div>
																		</div>
																		<div className="absolute bottom-0 right-0 flex shrink-0 md:relative">
																			<div className="bg-background-100 mb-xs shadow-subtle border-border/50 relative flex shrink-0 flex-row rounded-md border p-[1.5px] duration-150 pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100">
																				<button
																					aria-label="Edit Query"
																					type="button"
																					className="bg-offsetPlus dark:bg-offsetPlusDark text-textMain dark:text-textMainDark  md:hover:text-textOff md:dark:hover:text-textOffDark !bg-background-100 hover:!bg-background-200 shrink-0 !text-text-200 font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-xs h-6 aspect-[9/8]"
																					data-state="closed"
																				>
																					<div className="flex items-center min-w-0 font-medium gap-1 justify-center">
																						<div className="flex shrink-0 items-center justify-center size-3.5">
																							<svg
																								aria-hidden="true"
																								focusable="false"
																								data-prefix="far"
																								data-icon="pen-to-square"
																								className="svg-inline--fa fa-pen-to-square fa-fw fa-1x "
																								role="img"
																								xmlns="http://www.w3.org/2000/svg"
																								viewBox="0 0 512 512"
																							>
																								<path
																									fill="currentColor"
																									d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152L0 424c0 48.6 39.4 88 88 88l272 0c48.6 0 88-39.4 88-88l0-112c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 112c0 22.1-17.9 40-40 40L88 464c-22.1 0-40-17.9-40-40l0-272c0-22.1 17.9-40 40-40l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 64z"
																								></path>
																							</svg>
																						</div>
																					</div>
																				</button>
																				<div className="m-[1.5px] w-px border-r border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent"></div>
																				<button
																					aria-label="Copy Query"
																					type="button"
																					className="bg-offsetPlus dark:bg-offsetPlusDark text-textMain dark:text-textMainDark  md:hover:text-textOff md:dark:hover:text-textOffDark !bg-background-100 hover:!bg-background-200 shrink-0 !text-text-200 font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-xs h-6 aspect-[9/8]"
																					data-state="closed"
																				>
																					<div className="flex items-center min-w-0 font-medium gap-1 justify-center">
																						<div className="flex shrink-0 items-center justify-center size-3.5">
																							<svg
																								aria-hidden="true"
																								focusable="false"
																								data-prefix="far"
																								data-icon="copy"
																								className="svg-inline--fa fa-copy fa-fw fa-1x "
																								role="img"
																								xmlns="http://www.w3.org/2000/svg"
																								viewBox="0 0 448 512"
																							>
																								<path
																									fill="currentColor"
																									d="M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L400 115.9 400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"
																								></path>
																							</svg>
																						</div>
																					</div>
																				</button>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
														</div>

														{/* pro search and sources icon container */}
														<div
															className="bg-background-100 -mx-md px-md -top-0 z-10 md:sticky mb-md w-full"
															style={{ marginTop: "-40px" }}
														>
															<div className="mx-auto max-w-threadContentWidth">
																<div
																	data-testid="answer-mode-tabs"
																	style={{
																		transform: "none",
																		transformOrigin: "50% 50% 0px",
																	}}
																>
																	<div
																		className="max-w-threadContentWidth mx-auto flex items-end will-change-auto translate-y-sm pointer-events-none opacity-0 duration-0"
																		style={{ height: "40px" }}
																	>
																		<div className="line-clamp-1 translate-y-px default font-display text-lg font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			{/* Give me a report on the rise and
																			implications of AI-generated influencers
																			on social media */}
																			{/* {input} */}
																			{heading}
																		</div>
																	</div>
																	<div className="relative border-b border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																		<div className="-mx-md px-md scrollbar-none -mb-px -mt-px overflow-x-auto overflow-y-hidden pb-px pt-px">
																			<div className="table w-full">
																				<div className="inset-x-sm top-md will-change-opacity absolute bottom-0 shadow-md duration-100 opacity-0"></div>
																				<div className="gap-xs relative border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-background dark:bg-backgroundDark">
																					<div className="max-w-threadContentWidth mx-auto">
																						<div className="-mx-sm relative flex gap-1.5">
																							<button
																								className="py-md pl-sm user-select-none focus-visible:ring-offset-background focus-visible:ring-super group pointer-events-auto relative rounded-md pr-2.5 focus-visible:outline-none focus-visible:ring-1"
																								type="button"
																								aria-label="Pro Search"
																								data-testid="answer-mode-tabs-tab-answer"
																							>
																								<div className="absolute inset-x-0 inset-y-2.5 rounded-md opacity-0 transition-opacity duration-150 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark"></div>
																								<div className="relative flex items-center gap-1.5">
																									<div className="relative flex size-[18px] items-center justify-center">
																										<div style={{ opacity: 1 }}>
																											<svg
																												xmlns="http://www.w3.org/2000/svg"
																												width="16"
																												height="16"
																												viewBox="0 0 24 24"
																												color="currentColor"
																												className="text-text-100 duration-100 group-hover:opacity-100"
																												fill="currentColor"
																												fillRule="evenodd"
																											>
																												<path d="M11.9759 1.99999L11.9879 2.00001C10.5169 2.00565 9.21337 3.04861 8.26794 4.74799C7.90794 5.39599 7.59594 6.13999 7.35594 6.95599C7.15194 7.62799 6.99594 8.35999 6.88794 9.13999C6.79194 9.84799 6.73194 10.604 6.71994 11.372V11.828C7.13994 12.092 7.79994 12.392 8.66394 12.62C8.63994 12.284 8.62794 11.948 8.62794 11.6C8.62794 11.252 8.63994 10.916 8.66394 10.58C8.71194 9.84799 8.79594 9.16399 8.92794 8.53999C9.08394 7.78399 9.28794 7.09999 9.52794 6.49999C9.89994 5.57599 10.3679 4.87999 10.8599 4.43599C11.2319 4.09999 11.6159 3.91999 11.9879 3.91999C12.3599 3.91999 12.7559 4.09999 13.1159 4.43599C14.0279 4.48399 14.8919 4.59199 15.7079 4.74799C14.7625 3.04861 13.459 2.00565 11.9879 2.00001L11.9999 1.99999H11.9759Z M17.268 11.372C16.848 11.108 16.188 10.808 15.324 10.58C15.348 10.916 15.36 11.252 15.36 11.6C15.36 11.948 15.348 12.284 15.324 12.62C15.276 13.352 15.192 14.036 15.06 14.66C14.904 15.416 14.7 16.1 14.46 16.7C14.088 17.624 13.62 18.32 13.128 18.764C12.756 19.1 12.372 19.28 12 19.28C11.628 19.28 11.232 19.1 10.872 18.764C9.96 18.716 9.096 18.608 8.28 18.452C9.228 20.156 10.536 21.2 12.012 21.2C13.488 21.2 14.796 20.156 15.744 18.452C16.104 17.804 16.416 17.06 16.656 16.244C16.86 15.572 17.016 14.84 17.124 14.06C17.22 13.352 17.28 12.596 17.292 11.828V11.372H17.268Z M13.368 10.232H13.344C12.996 9.89601 12.528 9.68001 12 9.68001C11.472 9.68001 11.004 9.89601 10.656 10.232H10.632V10.268C10.296 10.616 10.092 11.084 10.092 11.6C10.092 12.116 10.296 12.596 10.632 12.932V12.968H10.656C11.004 13.304 11.472 13.52 12 13.52C12.528 13.52 12.996 13.304 13.344 12.968H13.368V12.932C13.704 12.584 13.908 12.116 13.908 11.6C13.908 11.084 13.704 10.604 13.368 10.268V10.232Z M10.968 14.924C10.248 14.876 9.56397 14.792 8.92797 14.66C8.17197 14.504 7.48797 14.3 6.88797 14.06C5.96397 13.688 5.26797 13.22 4.82397 12.728C4.48797 12.356 4.30797 11.972 4.30797 11.6C4.30797 11.228 4.48797 10.832 4.82397 10.472C4.87197 9.55999 4.97997 8.69599 5.13597 7.87999C3.43197 8.82799 2.38797 10.136 2.38797 11.612C2.38797 13.088 3.43197 14.396 5.13597 15.344C5.78397 15.704 6.52797 16.016 7.34397 16.256C8.01597 16.46 8.74797 16.616 9.52797 16.724C10.236 16.82 10.992 16.88 11.76 16.892H12.216C12.48 16.472 12.78 15.812 13.008 14.948C12.672 14.972 12.336 14.984 11.976 14.984C11.616 14.984 11.28 14.972 10.944 14.948L10.968 14.924Z M18.852 7.86793C18.204 7.50793 17.46 7.19594 16.644 6.95594C15.972 6.75194 15.24 6.59593 14.46 6.48794C13.752 6.39193 12.996 6.33193 12.228 6.31993H11.772C11.508 6.73993 11.208 7.39993 10.968 8.26393C11.304 8.23993 11.64 8.22793 12 8.22793C12.36 8.22793 12.696 8.23993 13.032 8.26393C13.752 8.31193 14.436 8.39594 15.072 8.52794C15.828 8.68393 16.512 8.88793 17.112 9.12793C18.036 9.49993 18.732 9.96794 19.176 10.4599C19.512 10.8319 19.692 11.2159 19.692 11.5879C19.692 11.9599 19.512 12.3559 19.176 12.7159C19.128 13.6279 19.02 14.4919 18.864 15.3079C20.568 14.3599 21.612 13.0519 21.612 11.5759C21.612 10.0999 20.568 8.79193 18.864 7.84393L18.852 7.86793Z"></path>
																											</svg>
																										</div>
																									</div>
																									<div className="relative min-w-[50px]">
																										<div
																											className="absolute whitespace-nowrap"
																											style={{
																												opacity: 1,
																												transform: "none",
																											}}
																										>
																											<div className="text-text-100 whitespace-nowrap text-sm font-[475] duration-150 group-hover:opacity-100 default font-sans text-base text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																												Pro Search
																											</div>
																										</div>
																										<div className="invisible">
																											<div className="text-text-100 whitespace-nowrap text-sm font-[475] default font-sans text-base text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																												Pro Search
																											</div>
																										</div>
																									</div>
																								</div>
																								<div
																									className="bg-text-100 inset-x-sm absolute -bottom-px h-[2.5px]"
																									style={{
																										transform: "none",
																										transformOrigin:
																											"50% 50% 0px",
																										opacity: 1,
																									}}
																								></div>
																							</button>
																							<button
																								className="py-md pl-sm user-select-none focus-visible:ring-offset-background focus-visible:ring-super group pointer-events-auto relative rounded-md pr-2.5 focus-visible:outline-none focus-visible:ring-1"
																								type="button"
																								aria-label="Sources"
																								data-testid="answer-mode-tabs-tab-sources"
																								style={{
																									opacity: 1,
																									transform: "none",
																								}}
																							>
																								<div className="absolute inset-x-0 inset-y-2.5 rounded-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark"></div>
																								<div className="relative flex items-center gap-1.5">
																									<svg
																										xmlns="http://www.w3.org/2000/svg"
																										width="16"
																										height="16"
																										viewBox="0 0 24 24"
																										color="currentColor"
																										className="text-text-100 duration-100 group-hover:opacity-100 opacity-80"
																										fill="currentColor"
																										fillRule="evenodd"
																									>
																										<path d="M12.2401 8.96004C10.6561 8.96004 9.36011 7.66404 9.36011 6.08004C9.36011 4.49604 10.6561 3.20004 12.2401 3.20004C13.8241 3.20004 15.1201 4.49604 15.1201 6.08004C15.1201 7.66404 13.8241 8.96004 12.2401 8.96004ZM12.2401 5.12004C11.7121 5.12004 11.2801 5.55204 11.2801 6.08004C11.2801 6.60804 11.7121 7.04004 12.2401 7.04004C12.7681 7.04004 13.2001 6.60804 13.2001 6.08004C13.2001 5.55204 12.7681 5.12004 12.2401 5.12004Z M18 14.7201C16.416 14.7201 15.12 13.4241 15.12 11.8401C15.12 10.2561 16.416 8.96011 18 8.96011C19.584 8.96011 20.88 10.2561 20.88 11.8401C20.88 13.4241 19.584 14.7201 18 14.7201ZM18 10.8801C17.472 10.8801 17.04 11.3121 17.04 11.8401C17.04 12.3681 17.472 12.8001 18 12.8001C18.528 12.8001 18.96 12.3681 18.96 11.8401C18.96 11.3121 18.528 10.8801 18 10.8801Z M6.48004 14.7201C4.89604 14.7201 3.60004 13.4241 3.60004 11.8401C3.60004 10.2561 4.89604 8.96011 6.48004 8.96011C8.06404 8.96011 9.36004 10.2561 9.36004 11.8401C9.36004 13.4241 8.06404 14.7201 6.48004 14.7201ZM6.48004 10.8801C5.95204 10.8801 5.52004 11.3121 5.52004 11.8401C5.52004 12.3681 5.95204 12.8001 6.48004 12.8001C7.00804 12.8001 7.44004 12.3681 7.44004 11.8401C7.44004 11.3121 7.00804 10.8801 6.48004 10.8801Z M12.2401 20.48C10.6561 20.48 9.36011 19.184 9.36011 17.6C9.36011 16.016 10.6561 14.72 12.2401 14.72C13.8241 14.72 15.1201 16.016 15.1201 17.6C15.1201 19.184 13.8241 20.48 12.2401 20.48ZM12.2401 16.64C11.7121 16.64 11.2801 17.072 11.2801 17.6C11.2801 18.128 11.7121 18.56 12.2401 18.56C12.7681 18.56 13.2001 18.128 13.2001 17.6C13.2001 17.072 12.7681 16.64 12.2401 16.64Z"></path>
																									</svg>
																									<div className="text-text-100 whitespace-nowrap text-sm font-[475] duration-150 group-hover:opacity-100 opacity-80 default font-sans text-base text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																										Sources
																									</div>
																									<span className="mb-px rounded-[0.3125rem] px-[0.3rem] py-px text-center align-middle font-mono text-[11px] tabular-nums leading-none border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offsetPlus dark:bg-offsetPlusDark">
																										<span
																											style={{
																												color: "white",
																												padding: "1em 0.5em",
																											}}
																										>
																											{/* <number-flow-react
																												aria-label="35"
																												role="img"
																											></number-flow-react> */}
																											{/* number of sources */}
																											{/* 9999 */}n
																										</span>
																									</span>
																								</div>
																							</button>
																							<div
																								className="ml-auto flex items-center"
																								style={{
																									opacity: 1,
																									transform: "none",
																								}}
																							>
																								<button
																									type="button"
																									className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark !py-md [&amp;_*]:!font-regular hover:!bg-offset shrink-0 whitespace-nowrap rounded-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-xs h-6 pl-2 pr-1.5"
																								>
																									<div className="flex items-center min-w-0 font-medium gap-1 justify-center">
																										{/* number of tasks */}
																										<div className="text-align-center relative truncate leading-loose -mb-px">
																											n tasks
																										</div>
																										<svg
																											xmlns="http://www.w3.org/2000/svg"
																											width="14"
																											height="14"
																											viewBox="0 0 24 24"
																											fill="none"
																											stroke="currentColor"
																											strokeWidth="1.7142857142857142"
																											strokeLinecap="round"
																											strokeLinejoin="round"
																											className="tabler-icon tabler-icon-arrow-up-right duration-150"
																										>
																											<path d="M17 7l-10 10"></path>
																											<path d="M8 7l9 0l0 9"></path>
																										</svg>
																									</div>
																								</button>
																							</div>
																						</div>
																					</div>
																				</div>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
														</div>

														{/* sources cards */}
														<div className="flex border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
															<div className="min-w-full">
																<div className="gap-sm grid grid-flow-col md:grid-cols-[1fr_1fr_1fr_96px] md:px-0 grid-cols-4">
																	{/* cards */}
																	{/* <div className="md:w-auto">
																		<div
																			className="size-full"
																			data-state="closed"
																			aria-label="The Digital Revolution of AI Influencers on Instagram - Lefty"
																		>
																			<a
																				target="_blank"
																				rel="noopener"
																				className="group flex w-full cursor-pointer items-stretch h-full"
																				href="https://lefty.io/blog/ai-influencers-on-instagram"
																			>
																				<div className="w-full">
																					<div className="group relative flex w-full items-stretch h-full">
																						<div className="flex w-full rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 transition duration-300 bg-offset dark:bg-offsetDark md:hover:bg-offsetPlus md:dark:hover:bg-offsetPlusDark">
																							<div className="items gap-xs pointer-events-none relative flex h-full max-w-full select-none flex-col px-sm pb-sm pt-sm w-full">
																								<div className="flex w-full items-center justify-between">
																									<div className="space-x-xs flex">
																										<div className="flex items-center gap-x-1.5 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																											<div className="relative flex-none">
																												<div className="relative overflow-hidden rounded-full">
																													<div className="rounded-inherit absolute inset-0 bg-white"></div>
																													<img
																														className="relative block"
																														alt="lefty.io favicon"
																														width="16"
																														height="16"
																														src="https://www.google.com/s2/favicons?sz=128&amp;domain=lefty.io"
																														style={{
																															width: "16px",
																															height: "16px",
																														}}
																													/>
																													<div className="rounded-inherit absolute bottom-0 left-0 right-0 top-0 border border-[black]/10 dark:border-transparent"></div>
																												</div>
																											</div>
																											<div className="line-clamp-1 break-all transition-all duration-300 max-w-[150px] light font-sans text-xs font-medium text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																												Lefty
																											</div>
																										</div>
																									</div>
																									<div></div>
																								</div>
																								<div className="default font-sans text-xs font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																									<span className="line-clamp-1 text-left md:line-clamp-2">
																										The Digital Revolution of AI
																										Influencers on Instagram -
																										Lefty
																									</span>
																								</div>
																							</div>
																						</div>
																					</div>
																				</div>
																			</a>
																		</div>
																	</div>
																	<div className="md:w-auto">
																		<div
																			className="size-full"
																			data-state="closed"
																			aria-label="AI Influencer Market Statistics 2025 - Artsmart.ai"
																		>
																			<a
																				target="_blank"
																				rel="noopener"
																				className="group flex w-full cursor-pointer items-stretch h-full"
																				href="https://artsmart.ai/blog/ai-influencer-statistics/"
																			>
																				<div className="w-full">
																					<div className="group relative flex w-full items-stretch h-full">
																						<div className="flex w-full rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 transition duration-300 bg-offset dark:bg-offsetDark md:hover:bg-offsetPlus md:dark:hover:bg-offsetPlusDark">
																							<div className="items gap-xs pointer-events-none relative flex h-full max-w-full select-none flex-col px-sm pb-sm pt-sm w-full">
																								<div className="flex w-full items-center justify-between">
																									<div className="space-x-xs flex">
																										<div className="flex items-center gap-x-1.5 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																											<div className="relative flex-none">
																												<div className="relative overflow-hidden rounded-full">
																													<div className="rounded-inherit absolute inset-0 bg-white"></div>
																													<img
																														className="relative block"
																														alt="artsmart.ai favicon"
																														width="16"
																														height="16"
																														src="https://www.google.com/s2/favicons?sz=128&amp;domain=artsmart.ai"
																														style={{
																															width: "16px",
																															height: "16px",
																														}}
																													/>
																													<div className="rounded-inherit absolute bottom-0 left-0 right-0 top-0 border border-[black]/10 dark:border-transparent"></div>
																												</div>
																											</div>
																											<div className="line-clamp-1 break-all transition-all duration-300 max-w-[150px] light font-sans text-xs font-medium text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																												ARTSMART AI
																											</div>
																										</div>
																									</div>
																									<div></div>
																								</div>
																								<div className="default font-sans text-xs font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																									<span className="line-clamp-1 text-left md:line-clamp-2">
																										AI Influencer Market
																										Statistics 2025 -
																										Artsmart.ai
																									</span>
																								</div>
																							</div>
																						</div>
																					</div>
																				</div>
																			</a>
																		</div>
																	</div>
																	<div className="md:w-auto">
																		<div
																			className="size-full"
																			data-state="closed"
																			aria-label="Top 10 AI Influencers Making Waves on Instagram"
																		>
																			<a
																				target="_blank"
																				rel="noopener"
																				className="group flex w-full cursor-pointer items-stretch h-full"
																				href="https://influencermarketinghub.com/ai-influencers-instagram/"
																			>
																				<div className="w-full">
																					<div className="group relative flex w-full items-stretch h-full">
																						<div className="flex w-full rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 transition duration-300 bg-offset dark:bg-offsetDark md:hover:bg-offsetPlus md:dark:hover:bg-offsetPlusDark">
																							<div className="items gap-xs pointer-events-none relative flex h-full max-w-full select-none flex-col px-sm pb-sm pt-sm w-full">
																								<div className="flex w-full items-center justify-between">
																									<div className="space-x-xs flex">
																										<div className="flex items-center gap-x-1.5 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																											<div className="relative flex-none">
																												<div className="relative overflow-hidden rounded-full">
																													<div className="rounded-inherit absolute inset-0 bg-white"></div>
																													<img
																														className="relative block"
																														alt="influencermarketinghub.com favicon"
																														width="16"
																														height="16"
																														src="https://www.google.com/s2/favicons?sz=128&amp;domain=influencermarketinghub.com"
																														style={{
																															width: "16px",
																															height: "16px",
																														}}
																													/>
																													<div className="rounded-inherit absolute bottom-0 left-0 right-0 top-0 border border-[black]/10 dark:border-transparent"></div>
																												</div>
																											</div>
																											<div className="line-clamp-1 break-all transition-all duration-300 max-w-[150px] light font-sans text-xs font-medium text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																												Influencer Marketing Hub
																											</div>
																										</div>
																									</div>
																									<div></div>
																								</div>
																								<div className="default font-sans text-xs font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																									<span className="line-clamp-1 text-left md:line-clamp-2">
																										Top 10 AI Influencers Making
																										Waves on Instagram
																									</span>
																								</div>
																							</div>
																						</div>
																					</div>
																				</div>
																			</a>
																		</div>
																	</div> */}
																</div>
															</div>
														</div>

														<div className="gap-y-sm flex flex-col w-full">
															<div>
																<div style={{ opacity: 1, transform: "none" }}>
																	<div className="ml-sm pl-sm gap-sm relative flex">
																		<span className="border-borderMain dark:border-borderMainDark absolute bottom-2 left-0 top-2 w-px border-l"></span>
																		<div className="gap-sm flex flex-col">
																			<div
																				className="group/goal research-goal "
																				role="listitem"
																			>
																				<div
																					className="px-sm focus-visible:bg-offset dark:focus-visible:bg-offsetDark relative flex w-full items-stretch rounded-md text-left transition-all duration-200 ease-out focus-visible:outline-none"
																					tabIndex={0}
																				>
																					<span className="flex w-full grow gap-[10px]">
																						<span className="flex grow overflow-hidden py-[6px]">
																							<div
																								className="overflow-hidden"
																								style={{ height: "20px" }}
																							>
																								<div>
																									<span className="pr-sm block text-pretty Goal_markdownWrapper__n2_e0 default font-sans text-sm text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																										<div className="relative">
																											Collecting web search
																											results about &quot;
																											{heading}&quot;
																										</div>
																									</span>
																								</div>
																							</div>
																						</span>
																					</span>
																				</div>
																				<div
																					className="group-only/goal:mb-sm group-last/goal:mb-xs w-full"
																					id="exploring-the-implications-of-ai-generated-influencers-on-social-media"
																				>
																					<div className="mr-lg w-full overflow-hidden">
																						<div
																							className="gap-[10px] px-sm flex"
																							style={{
																								opacity: 1,
																								transform: "none",
																							}}
																						>
																							<div className="pb-md gap-y-sm flex w-full flex-col group-last/goal:pb-0 group-only/goal:pb-0">
																								<div
																									id="f413c329-619e-44bb-8c5f-602e35fccc4e"
																									style={{
																										opacity: 1,
																										transform: "none",
																									}}
																								>
																									<div
																										className="gap-y-xs mt-1.5"
																										style={{ opacity: 1 }}
																									>
																										<div className="mb-1 light font-sans text-xs text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																											{/* <span className="animate-gradient bg-gradient-to-l bg-clip-text text-transparent from-textMain via-40% via-superDark via-60% to-textMain dark:from-super via-20% dark:via-textMain/35  via-80% dark:to-super"> */}
																											<span>
																												{searchingText}
																											</span>
																										</div>
																										<div className="gap-sm flex flex-wrap">
																											<div className="gap-sm flex flex-wrap items-center">
																												<div
																													className="inline-flex"
																													style={{
																														opacity: 1,
																														transform: "none",
																													}}
																												>
																													{/* badge with search text */}
																													{/* <div className="py-xs rounded-lg px-2.5 pl-2 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
																														<div className="gap-x-sm flex !text-[0.68rem] leading-4 default font-mono text-xs text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																															<div className="h-4 pt-px">
																																<svg
																																	xmlns="http://www.w3.org/2000/svg"
																																	width="14"
																																	height="14"
																																	viewBox="0 0 24 24"
																																	fill="none"
																																	stroke="currentColor"
																																	strokeWidth="1.7142857142857142"
																																	strokeLinecap="round"
																																	strokeLinejoin="round"
																																	className="tabler-icon tabler-icon-search "
																																>
																																	<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path>
																																	<path d="M21 21l-6 -6"></path>
																																</svg>
																															</div>
																															<p>
																																implications of
																																AI influencers
																																on social media
																															</p>
																														</div>
																													</div> */}
																													{/* custom code */}
																													{visibleQuery && (
																														<div className="py-xs rounded-lg px-2.5 pl-2 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
																															<div className="gap-x-sm flex !text-[0.68rem] leading-4 default font-mono text-xs text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																																<div className="h-4 pt-px">
																																	<svg
																																		xmlns="http://www.w3.org/2000/svg"
																																		width="14"
																																		height="14"
																																		viewBox="0 0 24 24"
																																		fill="none"
																																		stroke="currentColor"
																																		strokeWidth="1.7142857142857142"
																																		strokeLinecap="round"
																																		strokeLinejoin="round"
																																		className="tabler-icon tabler-icon-search "
																																	>
																																		<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path>
																																		<path d="M21 21l-6 -6"></path>
																																	</svg>
																																</div>
																																<p>
																																	{visibleQuery}
																																</p>
																															</div>
																														</div>
																													)}
																													{/* <div className="py-xs rounded-lg px-2.5 pl-2 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
																														<div className="gap-x-sm flex !text-[0.68rem] leading-4 default font-mono text-xs text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																															{visibleQueries &&
																																visibleQueries.map(
																																	(
																																		visibleQuery,
																																		index
																																	) => (
																																		<div
																																			key={
																																				index
																																			}
																																		>
																																			<div className="h-4 pt-px">
																																				<svg
																																					xmlns="http://www.w3.org/2000/svg"
																																					width="14"
																																					height="14"
																																					viewBox="0 0 24 24"
																																					fill="none"
																																					stroke="currentColor"
																																					strokeWidth="1.7142857142857142"
																																					strokeLinecap="round"
																																					strokeLinejoin="round"
																																					className="tabler-icon tabler-icon-search "
																																				>
																																					<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path>
																																					<path d="M21 21l-6 -6"></path>
																																				</svg>
																																			</div>
																																			<p>
																																				{
																																					visibleQuery
																																				}
																																			</p>
																																		</div>
																																	)
																																)}
																														</div>
																													</div> */}
																												</div>
																											</div>
																										</div>
																									</div>
																								</div>
																							</div>
																						</div>
																					</div>
																				</div>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
															<div className="gap-y-lg first:mt-sm mt-4 flex flex-col"></div>
														</div>

														{/* streaming content */}
														<div className="gap-y-lg first:mt-sm mt-4 flex flex-col">
															<div className="border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																<div className="gap-y-md flex flex-col">
																	<div className="relative default font-sans text-base text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																		<div className="min-w-0 break-words [word-break:break-word]">
																			<div
																				dir="auto"
																				id="markdown-content-0"
																				className="gap-y-md after:clear-both after:block after:content-['']"
																			>
																				<div className="relative">
																					{/* streaming tokens container */}
																					<div className="prose text-pretty dark:prose-invert inline leading-normal break-words min-w-0 [word-break:break-word]">
																						{/* <p>streaming tokens</p> */}
																						{/* <pre className="whitespace-pre-wrap bg-white p-4 rounded shadow max-h-[00px] overflow-auto w-full"> */}
																						<pre className="whitespace-pre-wrap p-4 rounded w-full">
																							{output}
																							<div ref={outputRef} />
																						</pre>
																					</div>
																				</div>
																			</div>
																		</div>
																	</div>
																	<div className="flex items-center justify-between">
																		<div className="-ml-sm gap-xs flex items-center">
																			<button
																				type="button"
																				className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 pl-2.5 pr-3"
																				data-state="closed"
																			>
																				<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																					<div className="flex shrink-0 items-center justify-center size-4">
																						<svg
																							xmlns="http://www.w3.org/2000/svg"
																							width="16"
																							height="16"
																							viewBox="0 0 24 24"
																							fill="none"
																							stroke="currentColor"
																							strokeWidth="1.875"
																							strokeLinecap="round"
																							strokeLinejoin="round"
																							className="tabler-icon tabler-icon-share-3 "
																						>
																							<path d="M13 4v4c-6.575 1.028 -9.02 6.788 -10 12c-.037 .206 5.384 -5.962 10 -6v4l8 -7l-8 -7z"></path>
																						</svg>
																					</div>
																					<div className="text-align-center relative truncate leading-loose -mb-px">
																						Share
																					</div>
																				</div>
																			</button>
																			<div>
																				<span>
																					<button
																						type="button"
																						className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 pl-2.5 pr-3"
																						data-state="closed"
																					>
																						<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																							<div className="flex shrink-0 items-center justify-center size-4">
																								<svg
																									xmlns="http://www.w3.org/2000/svg"
																									width="16"
																									height="16"
																									viewBox="0 0 24 24"
																									fill="none"
																									stroke="currentColor"
																									strokeWidth="1.875"
																									strokeLinecap="round"
																									strokeLinejoin="round"
																									className="tabler-icon tabler-icon-file-export "
																								>
																									<path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
																									<path d="M11.5 21h-4.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v5m-5 6h7m-3 -3l3 3l-3 3"></path>
																								</svg>
																							</div>
																							<div className="text-align-center relative truncate leading-loose -mb-px">
																								Export
																							</div>
																						</div>
																					</button>
																				</span>
																			</div>
																			<div>
																				<span>
																					<button
																						type="button"
																						className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 pl-2.5 pr-3"
																					>
																						<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																							<div className="flex shrink-0 items-center justify-center size-4">
																								<svg
																									xmlns="http://www.w3.org/2000/svg"
																									width="16"
																									height="16"
																									viewBox="0 0 24 24"
																									fill="none"
																									stroke="currentColor"
																									strokeWidth="1.875"
																									strokeLinecap="round"
																									strokeLinejoin="round"
																									className="tabler-icon tabler-icon-repeat "
																								>
																									<path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3"></path>
																									<path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3"></path>
																								</svg>
																							</div>
																							<div className="text-align-center relative truncate leading-loose -mb-px">
																								Rewrite
																							</div>
																						</div>
																					</button>
																				</span>
																			</div>
																		</div>
																		<div className="gap-x-xs flex items-center">
																			<div className="gap-xs flex items-center border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																				<button
																					aria-label="Deepseek R1"
																					type="button"
																					className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																					data-state="closed"
																				>
																					<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																						<div className="flex shrink-0 items-center justify-center size-4">
																							<svg
																								xmlns="http://www.w3.org/2000/svg"
																								width="16"
																								height="16"
																								viewBox="0 0 24 24"
																								fill="none"
																								stroke="currentColor"
																								strokeWidth="1.875"
																								strokeLinecap="round"
																								strokeLinejoin="round"
																								className="tabler-icon tabler-icon-cpu "
																							>
																								<path d="M5 5m0 1a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z"></path>
																								<path d="M9 9h6v6h-6z"></path>
																								<path d="M3 10h2"></path>
																								<path d="M3 14h2"></path>
																								<path d="M10 3v2"></path>
																								<path d="M14 3v2"></path>
																								<path d="M21 10h-2"></path>
																								<path d="M21 14h-2"></path>
																								<path d="M14 21v-2"></path>
																								<path d="M10 21v-2"></path>
																							</svg>
																						</div>
																					</div>
																				</button>
																			</div>
																			<div className="gap-xs flex items-center border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																				<button
																					aria-label="Helpful"
																					type="button"
																					className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																					data-state="closed"
																				>
																					<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																						<div className="flex shrink-0 items-center justify-center size-4">
																							<svg
																								xmlns="http://www.w3.org/2000/svg"
																								width="16"
																								height="16"
																								viewBox="0 0 24 24"
																								fill="none"
																								stroke="currentColor"
																								strokeWidth="1.875"
																								strokeLinecap="round"
																								strokeLinejoin="round"
																								className="tabler-icon tabler-icon-thumb-up "
																							>
																								<path d="M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3"></path>
																							</svg>
																						</div>
																					</div>
																				</button>
																				<button
																					aria-label="Not helpful"
																					type="button"
																					className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																					data-state="closed"
																				>
																					<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																						<div className="flex shrink-0 items-center justify-center size-4">
																							<svg
																								xmlns="http://www.w3.org/2000/svg"
																								width="16"
																								height="16"
																								viewBox="0 0 24 24"
																								fill="none"
																								stroke="currentColor"
																								strokeWidth="1.875"
																								strokeLinecap="round"
																								strokeLinejoin="round"
																								className="tabler-icon tabler-icon-thumb-down "
																							>
																								<path d="M7 13v-8a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v7a1 1 0 0 0 1 1h3a4 4 0 0 1 4 4v1a2 2 0 0 0 4 0v-5h3a2 2 0 0 0 2 -2l-1 -5a2 3 0 0 0 -2 -2h-7a3 3 0 0 0 -3 3"></path>
																							</svg>
																						</div>
																					</div>
																				</button>
																			</div>
																			<button
																				aria-label="Copy"
																				type="button"
																				className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																				data-state="closed"
																			>
																				<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																					<div className="flex shrink-0 items-center justify-center size-4">
																						<svg
																							xmlns="http://www.w3.org/2000/svg"
																							width="16"
																							height="16"
																							viewBox="0 0 24 24"
																							fill="none"
																							stroke="currentColor"
																							strokeWidth="1.875"
																							strokeLinecap="round"
																							strokeLinejoin="round"
																							className="tabler-icon tabler-icon-copy "
																						>
																							<path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"></path>
																							<path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"></path>
																						</svg>
																					</div>
																				</div>
																			</button>
																			<div className="">
																				<span>
																					<button
																						type="button"
																						className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																					>
																						<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																							<div className="flex shrink-0 items-center justify-center size-4">
																								<svg
																									xmlns="http://www.w3.org/2000/svg"
																									width="16"
																									height="16"
																									viewBox="0 0 24 24"
																									fill="none"
																									stroke="currentColor"
																									strokeWidth="1.875"
																									strokeLinecap="round"
																									strokeLinejoin="round"
																									className="tabler-icon tabler-icon-dots "
																								>
																									<path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path>
																									<path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path>
																									<path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path>
																								</svg>
																							</div>
																						</div>
																					</button>
																				</span>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
															<div className="">
																<div className="animate-in fade-in duration-100 ease-out border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																	<div className="border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																		<div className="flex items-center justify-between border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-background dark:bg-backgroundDark">
																			<div className="flex w-full items-center justify-between mb-sm">
																				<div className="">
																					<div
																						color="super"
																						className="space-x-sm flex items-center"
																					>
																						<div className="default font-display text-lg font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																							<div className="w-[24px]">
																								<svg
																									aria-hidden="true"
																									focusable="false"
																									data-prefix="fak"
																									data-icon="new-thread"
																									className="svg-inline--fa fa-new-thread fa-fw "
																									role="img"
																									xmlns="http://www.w3.org/2000/svg"
																									viewBox="0 0 512 512"
																								>
																									<path
																										fill="currentColor"
																										d="M467.2 115.2H313.6v51.2H467.2V115.2zm25.6 153.6H262.4V320H492.8V268.8zM262.4 115.2H32v51.2H262.4V115.2zm0 102.4H32v51.2H262.4V217.6zm0 102.4H32v51.2H262.4V320zm230.4 51.2H262.4v51.2H492.8V371.2zM416 64H364.8V217.6H416V64z"
																									></path>
																								</svg>
																							</div>
																						</div>
																						<div className="default font-display text-lg font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																							People also ask
																						</div>
																					</div>
																				</div>
																			</div>
																		</div>
																		<div className="divide-y border-t border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																			<div className="py-sm group flex cursor-pointer items-center justify-between">
																				<div className="md:group-hover:text-super md:dark:group-hover:text-superDark overflow-hidden text-ellipsis transition-all duration-300 default font-sans text-base font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					Using placeholders here as I dint want
																					to use up llm api credits for these 😅
																				</div>
																				<div className="ml-sm flex-none transition-all duration-300 super font-sans text-base font-medium text-super dark:text-superDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					<svg
																						aria-hidden="true"
																						focusable="false"
																						data-prefix="far"
																						data-icon="plus"
																						className="svg-inline--fa fa-plus fa-fw "
																						role="img"
																						xmlns="http://www.w3.org/2000/svg"
																						viewBox="0 0 448 512"
																					>
																						<path
																							fill="currentColor"
																							d="M248 72c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 160L40 232c-13.3 0-24 10.7-24 24s10.7 24 24 24l160 0 0 160c0 13.3 10.7 24 24 24s24-10.7 24-24l0-160 160 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-160 0 0-160z"
																						></path>
																					</svg>
																				</div>
																			</div>
																			<div className="py-sm group flex cursor-pointer items-center justify-between">
																				<div className="md:group-hover:text-super md:dark:group-hover:text-superDark overflow-hidden text-ellipsis transition-all duration-300 default font-sans text-base font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					Lorem ipsum dolor sit amet,
																					consectetur adipiscing elit.
																				</div>
																				<div className="ml-sm flex-none transition-all duration-300 super font-sans text-base font-medium text-super dark:text-superDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					<svg
																						aria-hidden="true"
																						focusable="false"
																						data-prefix="far"
																						data-icon="plus"
																						className="svg-inline--fa fa-plus fa-fw "
																						role="img"
																						xmlns="http://www.w3.org/2000/svg"
																						viewBox="0 0 448 512"
																					>
																						<path
																							fill="currentColor"
																							d="M248 72c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 160L40 232c-13.3 0-24 10.7-24 24s10.7 24 24 24l160 0 0 160c0 13.3 10.7 24 24 24s24-10.7 24-24l0-160 160 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-160 0 0-160z"
																						></path>
																					</svg>
																				</div>
																			</div>
																			<div className="py-sm group flex cursor-pointer items-center justify-between">
																				<div className="md:group-hover:text-super md:dark:group-hover:text-superDark overflow-hidden text-ellipsis transition-all duration-300 default font-sans text-base font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					Lorem ipsum dolor sit amet,
																					consectetur adipiscing elit.
																				</div>
																				<div className="ml-sm flex-none transition-all duration-300 super font-sans text-base font-medium text-super dark:text-superDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					<svg
																						aria-hidden="true"
																						focusable="false"
																						data-prefix="far"
																						data-icon="plus"
																						className="svg-inline--fa fa-plus fa-fw "
																						role="img"
																						xmlns="http://www.w3.org/2000/svg"
																						viewBox="0 0 448 512"
																					>
																						<path
																							fill="currentColor"
																							d="M248 72c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 160L40 232c-13.3 0-24 10.7-24 24s10.7 24 24 24l160 0 0 160c0 13.3 10.7 24 24 24s24-10.7 24-24l0-160 160 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-160 0 0-160z"
																						></path>
																					</svg>
																				</div>
																			</div>
																			<div className="py-sm group flex cursor-pointer items-center justify-between">
																				<div className="md:group-hover:text-super md:dark:group-hover:text-superDark overflow-hidden text-ellipsis transition-all duration-300 default font-sans text-base font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					Lorem ipsum dolor sit amet,
																					consectetur adipiscing elit.
																				</div>
																				<div className="ml-sm flex-none transition-all duration-300 super font-sans text-base font-medium text-super dark:text-superDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					<svg
																						aria-hidden="true"
																						focusable="false"
																						data-prefix="far"
																						data-icon="plus"
																						className="svg-inline--fa fa-plus fa-fw "
																						role="img"
																						xmlns="http://www.w3.org/2000/svg"
																						viewBox="0 0 448 512"
																					>
																						<path
																							fill="currentColor"
																							d="M248 72c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 160L40 232c-13.3 0-24 10.7-24 24s10.7 24 24 24l160 0 0 160c0 13.3 10.7 24 24 24s24-10.7 24-24l0-160 160 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-160 0 0-160z"
																						></path>
																					</svg>
																				</div>
																			</div>
																			<div className="py-sm group flex cursor-pointer items-center justify-between">
																				<div className="md:group-hover:text-super md:dark:group-hover:text-superDark overflow-hidden text-ellipsis transition-all duration-300 default font-sans text-base font-medium text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					Lorem ipsum dolor sit amet,
																					consectetur adipiscing elit.
																				</div>
																				<div className="ml-sm flex-none transition-all duration-300 super font-sans text-base font-medium text-super dark:text-superDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																					<svg
																						aria-hidden="true"
																						focusable="false"
																						data-prefix="far"
																						data-icon="plus"
																						className="svg-inline--fa fa-plus fa-fw "
																						role="img"
																						xmlns="http://www.w3.org/2000/svg"
																						viewBox="0 0 448 512"
																					>
																						<path
																							fill="currentColor"
																							d="M248 72c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 160L40 232c-13.3 0-24 10.7-24 24s10.7 24 24 24l160 0 0 160c0 13.3 10.7 24 24 24s24-10.7 24-24l0-160 160 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-160 0 0-160z"
																						></path>
																					</svg>
																				</div>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
														</div>

														{/* <div className="relative w-full">
															<div className="mb-lg pb-xs bottom-0 w-full md:absolute md:text-center">
																<div className="default font-sans text-base text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																	<span className="font-regular font-display text-3xl md:text-4xl">
																		What do you want to know?
																	</span>
																</div>
															</div>
														</div> */}
														{/* <div className="w-full">
															<div className="relative">
																<div>
																	<span className="grow block">
																		<div className="rounded-3xl">
																			<div className="bg-background w-full outline-none focus:outline-none focus:ring-borderMain font-sans flex items-center text-textMain placeholder-textOff border focus:ring-1 dark:bg-offsetDark dark:text-textMainDark dark:placeholder-textOffDark selection:bg-superDuper selection:text-textMain duration-75 transition-all border-borderMain dark:border-textMain/10 shadow-sm dark:shadow-md shadow-textMain/5 dark:shadow-black/10 rounded-3xl px-md pt-3 pb-3 grid items-center">
																				<div className="grid-rows-1fr-auto grid grid-cols-3">
																					<div className="col-start-1 col-end-4 pb-sm overflow-hidden relative flex h-full w-full">
																						<textarea
																							autoFocus
																							placeholder="Ask anything..."
																							className="overflow-auto max-h-[45vh] lg:max-h-[40vh] sm:max-h-[25vh] outline-none w-full font-sans caret-superDuper resize-none selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark dark:bg-offsetDark dark:text-textMainDark dark:placeholder-textOffDark placeholder:select-none bg-background text-textMain placeholder-textOff scrollbar-thumb-idle dark:scrollbar-thumb-idleDark scrollbar-thin scrollbar-track-transparent"
																							autoComplete="off"
																							rows={2}
																							data-1p-ignore="true"
																						></textarea>
																					</div>
																					<div className="bg-background dark:bg-offsetDark gap-sm flex rounded-l-lg col-start-1 row-start-2 -ml-1">
																						<div className="gap-sm flex">
																							<div className="gap-sm flex items-center">
																								<button
																									type="button"
																									className="border border-super/20 bg-super/10 hover:bg-super/20 hover:border-super/30 text-super dark:border-superDark/20 dark:bg-superDark/10 dark:text-superDark dark:hover:bg-superDark/20 dark:hover:border-superDark/30 px-2.5 font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																								>
																									<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																										<div>
																											<svg
																												xmlns="http://www.w3.org/2000/svg"
																												width="28"
																												height="28"
																												viewBox="0 0 24 24"
																												color="currentColor"
																												fill="currentColor"
																												fillRule="evenodd"
																											>
																												<path d="M5.01 17.833h11.023a6.34 6.34 0 0 0 2.91-.676 5.484 5.484 0 0 0 2.274-2.136c.52-.88.783-1.896.783-3.021s-.263-2.14-.782-3.02a5.484 5.484 0 0 0-2.271-2.135 6.348 6.348 0 0 0-2.914-.678H2.018v1.176h14.015c.849 0 1.636.182 2.341.542a4.285 4.285 0 0 1 1.776 1.671l.002.004c.414.7.624 1.52.624 2.44 0 .92-.21 1.741-.625 2.442l-.002.003a4.286 4.286 0 0 1-1.778 1.672c-.702.359-1.49.54-2.338.54H5.011v1.176ZM3.415 9.568c1.209-1.272 3.672-.9 4.537.67.293.48.442 1.072.442 1.762.041 1.78-1.22 3.211-3.054 3.2-.822 0-1.468-.307-1.925-.77-.036-.037-.102-.012-.102.04v3.363H2V9.03h1.312v.5c0 .051.066.076.102.038Zm3.135 4.015c.352-.358.531-.94.531-1.583 0-.645-.178-1.223-.532-1.574-.64-.72-2.126-.712-2.772.001-.697.677-.69 2.475 0 3.156.646.698 2.132.706 2.773 0Zm12.28-3.31c-1.09-1.969-4.506-1.966-5.604 0-.277.48-.418 1.06-.418 1.727-.038 1.88 1.296 3.212 3.225 3.2 1.928.012 3.258-1.333 3.225-3.2 0-.667-.144-1.248-.429-1.727ZM17.944 12c0 .644-.179 1.225-.532 1.583-.64.706-2.127.699-2.773 0-.69-.681-.697-2.48 0-3.155.646-.714 2.132-.721 2.773-.002.354.352.532.929.532 1.573Zm-6.96-2.85c.249-.136.591-.206 1.017-.206h.633v1.276c-.11.002-.227 0-.347-.001-.542-.008-1.152-.016-1.488.318-.222.21-.334.57-.334 1.072v3.423H9.154V9.03h1.312v.5c0 .056.078.078.11.029.127-.197.262-.331.409-.408Z"></path>
																											</svg>
																										</div>
																									</div>
																								</button>
																								<button
																									type="button"
																									className="bg-offsetPlus dark:bg-offsetPlusDark text-textMain dark:text-textMainDark md:hover:text-textOff md:dark:hover:text-textOffDark border border-transparent font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 pl-2.5 pr-3"
																								>
																									<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																										<div className="flex shrink-0 items-center justify-center size-4">
																											<svg
																												xmlns="http://www.w3.org/2000/svg"
																												width="16"
																												height="16"
																												viewBox="0 0 24 24"
																												fill="none"
																												stroke="currentColor"
																												strokeWidth="1.875"
																												strokeLinecap="round"
																												strokeLinejoin="round"
																												className="tabler-icon tabler-icon-atom"
																											>
																												<path d="M12 12v.01"></path>
																												<path d="M19.071 4.929c-1.562 -1.562 -6 .337 -9.9 4.243c-3.905 3.905 -5.804 8.337 -4.242 9.9c1.562 1.561 6 -.338 9.9 -4.244c3.905 -3.905 5.804 -8.337 4.242 -9.9"></path>
																												<path d="M4.929 4.929c-1.562 1.562 .337 6 4.243 9.9c3.905 3.905 8.337 5.804 9.9 4.242c1.561 -1.562 -.338 -6 -4.244 -9.9c-3.905 -3.905 -8.337 -5.804 -9.9 -4.242"></path>
																											</svg>
																										</div>
																										<div className="text-align-center relative truncate leading-loose -mb-px">
																											Deep Research
																										</div>
																									</div>
																								</button>
																							</div>
																						</div>
																					</div>
																					<div className="bg-background dark:bg-offsetDark flex items-center justify-self-end rounded-full col-start-3 row-start-2 -mr-1">
																						<div style={{ opacity: 1 }}>
																							<span>
																								<button
																									aria-label="Choose a model"
																									type="button"
																									className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark max-w-24 sm:max-w-none font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																									data-state="closed"
																								>
																									<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																										<div className="flex shrink-0 items-center justify-center size-4">
																											<svg
																												xmlns="http://www.w3.org/2000/svg"
																												width="16"
																												height="16"
																												viewBox="0 0 24 24"
																												fill="none"
																												stroke="currentColor"
																												strokeWidth="1.875"
																												strokeLinecap="round"
																												strokeLinejoin="round"
																												className="tabler-icon tabler-icon-cpu"
																											>
																												<path d="M5 5m0 1a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z"></path>
																												<path d="M9 9h6v6h-6z"></path>
																												<path d="M3 10h2"></path>
																												<path d="M3 14h2"></path>
																												<path d="M10 3v2"></path>
																												<path d="M14 3v2"></path>
																												<path d="M21 10h-2"></path>
																												<path d="M21 14h-2"></path>
																												<path d="M14 21v-2"></path>
																												<path d="M10 21v-2"></path>
																											</svg>
																										</div>
																									</div>
																								</button>
																							</span>
																						</div>
																						<span>
																							<button
																								type="button"
																								className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark px-[4px] font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																								data-state="closed"
																							>
																								<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																									<div>
																										<div className="my-xs flex items-center">
																											<div className="flex items-center">
																												<div
																													className="relative flex items-center justify-center rounded-full size-6"
																													style={{ zIndex: 0 }}
																												>
																													<div className="flex size-5 items-center justify-center">
																														<svg
																															xmlns="http://www.w3.org/2000/svg"
																															width="16"
																															height="16"
																															viewBox="0 0 24 24"
																															fill="none"
																															stroke="currentColor"
																															strokeWidth="1.875"
																															strokeLinecap="round"
																															strokeLinejoin="round"
																															className="tabler-icon tabler-icon-world"
																														>
																															<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path>
																															<path d="M3.6 9h16.8"></path>
																															<path d="M3.6 15h16.8"></path>
																															<path d="M11.5 3a17 17 0 0 0 0 18"></path>
																															<path d="M12.5 3a17 17 0 0 1 0 18"></path>
																														</svg>
																													</div>
																												</div>
																											</div>
																										</div>
																									</div>
																								</div>
																							</button>
																						</span>
																						<div className="flex items-center">
																							<button
																								aria-label="Attach files. 0 left today"
																								type="button"
																								className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																								data-state="closed"
																							>
																								<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																									<div className="flex shrink-0 items-center justify-center size-4">
																										<svg
																											xmlns="http://www.w3.org/2000/svg"
																											width="16"
																											height="16"
																											viewBox="0 0 24 24"
																											fill="none"
																											stroke="currentColor"
																											strokeWidth="1.875"
																											strokeLinecap="round"
																											strokeLinejoin="round"
																											className="tabler-icon tabler-icon-paperclip"
																										>
																											<path d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"></path>
																										</svg>
																									</div>
																								</div>
																							</button>
																							<input
																								type="file"
																								multiple
																								accept=".pdf,.txt,.py,.ipynb,.js,.jsx,.html,.css,.java,.cs,.php,.c,.cpp,.cxx,.h,.hpp,.rs,.R,.Rmd,.swift,.go,.rb,.kt,.kts,.ts,.tsx,.m,.scala,.rs,.dart,.lua,.pl,.pm,.t,.sh,.bash,.zsh,.csv,.log,.ini,.config,.json,.yaml,.yml,.toml,.lua,.sql,.bat,.md,.coffee,.tex,.latex,.less,.pptx,.docx,.xlsx,.jpeg,.jpg,.jpe,.jp2,.png,.gif,.bmp,.tiff,.tif,.svg,.webp,.ico,.avif,.heic,.heif"
																								style={{ display: "none" }}
																							/>
																						</div>
																						<div className="relative ml-2">
																							<button
																								aria-label="Dictation"
																								type="button"
																								className="bg-super dark:bg-superDark dark:text-backgroundDark text-white hover:opacity-80 font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																								data-state="closed"
																							>
																								<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																									<div className="flex shrink-0 items-center justify-center size-4">
																										<svg
																											xmlns="http://www.w3.org/2000/svg"
																											width="16"
																											height="16"
																											viewBox="0 0 24 24"
																											fill="currentColor"
																											stroke="none"
																											className="tabler-icon tabler-icon-microphone-filled"
																										>
																											<path d="M19 9a1 1 0 0 1 1 1a8 8 0 0 1 -6.999 7.938l-.001 2.062h3a1 1 0 0 1 0 2h-8a1 1 0 0 1 0 -2h3v-2.062a8 8 0 0 1 -7 -7.938a1 1 0 1 1 2 0a6 6 0 0 0 12 0a1 1 0 0 1 1 -1m-7 -8a4 4 0 0 1 4 4v5a4 4 0 1 1 -8 0v-5a4 4 0 0 1 4 -4"></path>
																										</svg>
																									</div>
																								</div>
																							</button>
																						</div>
																					</div>
																				</div>
																			</div>
																		</div>
																	</span>
																</div>
															</div>
														</div> */}
														{/* <div className="relative w-full">
															<div className="absolute w-full">
																<template id="B:0"></template>
																<div className="mt-lg">
																	<div
																		className="gap-sm grid grid-cols-6"
																		style={{
																			gridTemplateRows:
																				"repeat(auto-fit, 64px)",
																			gridAutoRows: "64px",
																		}}
																	>
																		<div className="col-span-2 row-span-2 rounded-md opacity-50 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark"></div>
																		<div className="col-span-2 row-span-1 rounded-md opacity-50 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark"></div>
																		<div className="col-span-2 row-span-1 rounded-md opacity-50 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark"></div>
																		<div className="col-span-2 row-span-1 rounded-md opacity-50 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark"></div>
																		<div className="col-span-2 row-span-1 rounded-md opacity-50 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark"></div>
																	</div>
																</div>
															</div>
														</div> */}
													</div>
													<div className="bottom-mobileNavHeight md:bottom-md erp-sidecar:fixed pointer-events-none sticky z-10 w-full py-0 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50  dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
														<div className="px-md md:px-lg !p-sm md:!px-lg absolute bottom-0 left-0 right-0">
															<div className="max-w-threadContentWidth mx-auto">
																<div className="pointer-events-auto">
																	<div
																		style={{ opacity: 1, transform: "none" }}
																	>
																		<div className="w-full">
																			<div className="relative">
																				<div>
																					<span className="grow block">
																						<div className="rounded-full dark:shadow-[0_0_6px_4px] shadow-[0_4px_8px_4px] shadow-textMain/5 dark:shadow-background/30">
																							<div className="bg-background w-full outline-none focus:outline-none focus:ring-borderMain font-sans flex items-center text-textMain placeholder-textOff border focus:ring-1 dark:bg-offsetDark dark:text-textMainDark dark:placeholder-textOffDark selection:bg-superDuper selection:text-textMain duration-75 transition-all border-borderMain dark:border-textMain/10 shadow-sm dark:shadow-md shadow-textMain/5 dark:shadow-black/10 rounded-t-[32px] rounded-b-[32px] py-sm px-3 grid items-center">
																								<div className="flex">
																									<div className="flex-grow flex-shrink p-sm order-1 overflow-hidden relative flex h-full w-full">
																										{/* custom code */}
																										<textarea
																											placeholder={
																												textAreaPlaceholder
																											}
																											className="overflow-auto max-h-[45vh] lg:max-h-[40vh] sm:max-h-[25vh] outline-none w-full font-sans caret-superDuper resize-none selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark dark:bg-offsetDark dark:text-textMainDark dark:placeholder-textOffDark placeholder:select-none bg-background text-textMain placeholder-textOff  scrollbar-thumb-idle dark:scrollbar-thumb-idleDark scrollbar-thin scrollbar-track-transparent"
																											autoComplete="off"
																											disabled={
																												isTextAreaDisabled
																											}
																											rows={1}
																											data-1p-ignore="true"
																											value={input}
																											onChange={
																												handleInputChange
																											}
																											ref={textAreaRef}
																											style={{
																												height:
																													"24px !important",
																											}}
																											onKeyDown={handleKeyDown}
																										></textarea>
																									</div>
																									<div className="bg-background dark:bg-offsetDark gap-sm flex rounded-l-lg order-0 ml-px">
																										<div className="gap-sm flex">
																											<div className="gap-sm flex items-center">
																												<button
																													type="button"
																													className="border border-super/20 bg-super/10 hover:bg-super/20 hover:border-super/30 text-super dark:border-superDark/20 dark:bg-superDark/10 dark:text-superDark dark:hover:bg-superDark/20 dark:hover:border-superDark/30 pointer-events-none px-2.5 font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																												>
																													<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																														<div>
																															<svg
																																xmlns="http://www.w3.org/2000/svg"
																																width="28"
																																height="28"
																																viewBox="0 0 24 24"
																																color="currentColor"
																																fill="currentColor"
																																fillRule="evenodd"
																															>
																																<path d="M5.01 17.833h11.023a6.34 6.34 0 0 0 2.91-.676 5.484 5.484 0 0 0 2.274-2.136c.52-.88.783-1.896.783-3.021s-.263-2.14-.782-3.02a5.484 5.484 0 0 0-2.271-2.135 6.348 6.348 0 0 0-2.914-.678H2.018v1.176h14.015c.849 0 1.636.182 2.341.542a4.285 4.285 0 0 1 1.776 1.671l.002.004c.414.7.624 1.52.624 2.44 0 .92-.21 1.741-.625 2.442l-.002.003a4.286 4.286 0 0 1-1.778 1.672c-.702.359-1.49.54-2.338.54H5.011v1.176ZM3.415 9.568c1.209-1.272 3.672-.9 4.537.67.293.48.442 1.072.442 1.762.041 1.78-1.22 3.211-3.054 3.2-.822 0-1.468-.307-1.925-.77-.036-.037-.102-.012-.102.04v3.363H2V9.03h1.312v.5c0 .051.066.076.102.038Zm3.135 4.015c.352-.358.531-.94.531-1.583 0-.645-.178-1.223-.532-1.574-.64-.72-2.126-.712-2.772.001-.697.677-.69 2.475 0 3.156.646.698 2.132.706 2.773 0Zm12.28-3.31c-1.09-1.969-4.506-1.966-5.604 0-.277.48-.418 1.06-.418 1.727-.038 1.88 1.296 3.212 3.225 3.2 1.928.012 3.258-1.333 3.225-3.2 0-.667-.144-1.248-.429-1.727ZM17.944 12c0 .644-.179 1.225-.532 1.583-.64.706-2.127.699-2.773 0-.69-.681-.697-2.48 0-3.155.646-.714 2.132-.721 2.773-.002.354.352.532.929.532 1.573Zm-6.96-2.85c.249-.136.591-.206 1.017-.206h.633v1.276c-.11.002-.227 0-.347-.001-.542-.008-1.152-.016-1.488.318-.222.21-.334.57-.334 1.072v3.423H9.154V9.03h1.312v.5c0 .056.078.078.11.029.127-.197.262-.331.409-.408Z"></path>
																															</svg>
																														</div>
																													</div>
																												</button>
																												<button
																													type="button"
																													className="bg-offsetPlus dark:bg-offsetPlusDark text-textMain dark:text-textMainDark  md:hover:text-textOff md:dark:hover:text-textOffDark border border-transparent font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																												>
																													<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																														<div className="flex shrink-0 items-center justify-center size-4">
																															<svg
																																xmlns="http://www.w3.org/2000/svg"
																																width="16"
																																height="16"
																																viewBox="0 0 24 24"
																																fill="none"
																																stroke="currentColor"
																																strokeWidth="1.875"
																																strokeLinecap="round"
																																strokeLinejoin="round"
																																className="tabler-icon tabler-icon-atom "
																															>
																																<path d="M12 12v.01"></path>
																																<path d="M19.071 4.929c-1.562 -1.562 -6 .337 -9.9 4.243c-3.905 3.905 -5.804 8.337 -4.242 9.9c1.562 1.561 6 -.338 9.9 -4.244c3.905 -3.905 5.804 -8.337 4.242 -9.9"></path>
																																<path d="M4.929 4.929c-1.562 1.562 .337 6 4.243 9.9c3.905 3.905 8.337 5.804 9.9 4.242c1.561 -1.562 -.338 -6 -4.244 -9.9c-3.905 -3.905 -8.337 -5.804 -9.9 -4.242"></path>
																															</svg>
																														</div>
																													</div>
																												</button>
																											</div>
																										</div>
																									</div>
																									<div className="bg-background dark:bg-offsetDark flex items-center justify-self-end rounded-full order-2 mr-px">
																										<div style={{ opacity: 1 }}>
																											<span>
																												<button
																													aria-label="R1 1776"
																													type="button"
																													className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-super dark:text-superDark  dark:hover:bg-offsetPlusDark max-w-24 sm:max-w-none font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																													data-state="closed"
																												>
																													<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																														<div className="flex shrink-0 items-center justify-center size-4">
																															<svg
																																xmlns="http://www.w3.org/2000/svg"
																																width="16"
																																height="16"
																																viewBox="0 0 24 24"
																																fill="none"
																																stroke="currentColor"
																																strokeWidth="1.875"
																																strokeLinecap="round"
																																strokeLinejoin="round"
																																className="tabler-icon tabler-icon-cpu "
																															>
																																<path d="M5 5m0 1a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z"></path>
																																<path d="M9 9h6v6h-6z"></path>
																																<path d="M3 10h2"></path>
																																<path d="M3 14h2"></path>
																																<path d="M10 3v2"></path>
																																<path d="M14 3v2"></path>
																																<path d="M21 10h-2"></path>
																																<path d="M21 14h-2"></path>
																																<path d="M14 21v-2"></path>
																																<path d="M10 21v-2"></path>
																															</svg>
																														</div>
																													</div>
																												</button>
																											</span>
																										</div>
																										<div className="flex items-center">
																											<button
																												aria-label="Attach files"
																												type="button"
																												className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark  dark:hover:text-textMainDark font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																												data-state="closed"
																											>
																												<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																													<div className="flex shrink-0 items-center justify-center size-4">
																														<svg
																															xmlns="http://www.w3.org/2000/svg"
																															width="16"
																															height="16"
																															viewBox="0 0 24 24"
																															fill="none"
																															stroke="currentColor"
																															strokeWidth="1.875"
																															strokeLinecap="round"
																															strokeLinejoin="round"
																															className="tabler-icon tabler-icon-paperclip "
																														>
																															<path d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"></path>
																														</svg>
																													</div>
																												</div>
																											</button>
																											<input
																												multiple
																												accept=".pdf,.txt,.py,.ipynb,.js,.jsx,.html,.css,.java,.cs,.php,.c,.cpp,.cxx,.h,.hpp,.rs,.R,.Rmd,.swift,.go,.rb,.kt,.kts,.ts,.tsx,.m,.scala,.rs,.dart,.lua,.pl,.pm,.t,.sh,.bash,.zsh,.csv,.log,.ini,.config,.json,.yaml,.yml,.toml,.lua,.sql,.bat,.md,.coffee,.tex,.latex,.less,.pptx,.docx,.xlsx,.jpeg,.jpg,.jpe,.jp2,.png,.gif,.bmp,.tiff,.tif,.svg,.webp,.ico,.avif,.heic,.heif"
																												type="file"
																												style={{
																													display: "none",
																												}}
																											/>
																										</div>
																										<div className="relative ml-2">
																											{/* custom code */}
																											<button
																												aria-label="Dictation"
																												type="button"
																												className="bg-super dark:bg-superDark dark:text-backgroundDark text-white hover:opacity-80 font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans  select-none items-center relative group/button  justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
																												data-state="closed"
																												onClick={
																													startReasoningOrFeedback
																												}
																											>
																												<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
																													<div className="flex shrink-0 items-center justify-center size-4">
																														{/* <svg
																															xmlns="http://www.w3.org/2000/svg"
																															width="16"
																															height="16"
																															viewBox="0 0 24 24"
																															fill="currentColor"
																															stroke="none"
																															className="tabler-icon tabler-icon-microphone-filled "
																														>
																															<path d="M19 9a1 1 0 0 1 1 1a8 8 0 0 1 -6.999 7.938l-.001 2.062h3a1 1 0 0 1 0 2h-8a1 1 0 0 1 0 -2h3v-2.062a8 8 0 0 1 -7 -7.938a1 1 0 1 1 2 0a6 6 0 0 0 12 0a1 1 0 0 1 1 -1m-7 -8a4 4 0 0 1 4 4v5a4 4 0 1 1 -8 0v-5a4 4 0 0 1 4 -4"></path>
																														</svg> */}
																														<svg
																															xmlns="http://www.w3.org/2000/svg"
																															width="16"
																															height="16"
																															viewBox="0 0 24 24"
																															fill="none"
																															stroke="currentColor"
																															strokeWidth="1.875"
																															strokeLinecap="round"
																															strokeLinejoin="round"
																															className="tabler-icon tabler-icon-arrow-up "
																														>
																															<path d="M12 5l0 14"></path>
																															<path d="M18 11l-6 -6"></path>
																															<path d="M6 11l6 -6"></path>
																														</svg>
																													</div>
																												</div>
																											</button>
																										</div>
																									</div>
																								</div>
																							</div>
																						</div>
																					</span>
																				</div>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
														</div>
													</div>
													<div className="pb-md hidden md:block">
														<div>
															<div className="gap-x-md gap-y-sm px-sm pb-2xl flex flex-wrap items-center md:justify-center md:px-0 md:pb-0 border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
																<a href="/pro">
																	<div>
																		<div className="decoration-textOff/40 dark:decoration-textOffDark/40 hover:underline light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			Pro
																		</div>
																	</div>
																</a>
																<a
																	target="_blank"
																	href="https://www.perplexity.ai/enterprise"
																>
																	<div>
																		<div className="decoration-textOff/40 dark:decoration-textOffDark/40 hover:underline light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			Enterprise
																		</div>
																	</div>
																</a>
																<a
																	target="_blank"
																	href="https://sonar.perplexity.ai"
																>
																	<div>
																		<div className="decoration-textOff/40 dark:decoration-textOffDark/40 hover:underline light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			API
																		</div>
																	</div>
																</a>
																<a
																	target="_blank"
																	href="https://www.perplexity.ai/hub"
																>
																	<div>
																		<div className="decoration-textOff/40 dark:decoration-textOffDark/40 hover:underline light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			Blog
																		</div>
																	</div>
																</a>
																<a
																	target="_blank"
																	href="https://www.perplexity.ai/hub/careers"
																>
																	<div>
																		<div className="decoration-textOff/40 dark:decoration-textOffDark/40 hover:underline light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			Careers
																		</div>
																	</div>
																</a>
																<a
																	target="_blank"
																	href="https://www.perplexity.supply"
																>
																	<div>
																		<div className="decoration-textOff/40 dark:decoration-textOffDark/40 hover:underline light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			Store
																		</div>
																	</div>
																</a>
																<a target="_blank" href="/finance">
																	<div>
																		<div className="decoration-textOff/40 dark:decoration-textOffDark/40 hover:underline light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																			Finance
																		</div>
																	</div>
																</a>
																<div className="gap-xs decoration-textOff/40 dark:decoration-textOffDark/40 relative flex cursor-pointer items-center justify-stretch overflow-hidden hover:underline light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																	English
																	<div className="absolute left-0 top-0 opacity-0">
																		<div>
																			<div className="default font-sans text-sm text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																				<div className="relative flex items-center">
																					<select
																						id="interface-language-select"
																						className="border-borderMain/75 bg-background p-sm pr-lg outline-super ring-borderMain/75 dark:border-borderMainDark dark:bg-offsetDark dark:outline-superDark dark:ring-borderMainDark w-full appearance-none rounded border transition duration-300 focus:outline-none cursor-pointer hover:ring-1"
																						aria-label="Language:"
																						defaultValue="en-US"
																					>
																						<option value="en-US">
																							English
																						</option>
																						<option value="fr-FR">
																							français
																						</option>
																						<option value="de-DE">
																							Deutsch
																						</option>
																						<option value="ja-JP">
																							日本語
																						</option>
																						<option value="ko-KR">
																							한국어
																						</option>
																						<option value="zh-CN">
																							简体中文
																						</option>
																						<option value="zh-TW">
																							繁體中文
																						</option>
																						<option value="es-ES">
																							español
																						</option>
																						<option value="hi-IN">
																							हिन्दी
																						</option>
																						<option value="it-IT">
																							italiano
																						</option>
																						<option value="pt-BR">
																							português (Brasil)
																						</option>
																						<option value="cs-CZ">
																							čeština
																						</option>
																						<option value="hr-HR">
																							hrvatski
																						</option>
																						<option value="hu-HU">
																							magyar
																						</option>
																						<option value="pl-PL">
																							polski
																						</option>
																						<option value="pt-PT">
																							português europeu
																						</option>
																						<option value="sk-SK">
																							slovenčina
																						</option>
																						<option value="sr-Cyrl-ME">
																							српски (ћирилица, Црна Гора)
																						</option>
																						<option value="nl-NL">
																							Nederlands
																						</option>
																						<option value="el-GR">
																							Ελληνικά
																						</option>
																						<option value="ro-RO">
																							română
																						</option>
																						<option value="id-ID">
																							Indonesia
																						</option>
																					</select>
																					<div className="right-sm pointer-events-none absolute light font-sans text-sm text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																						<svg
																							aria-hidden="true"
																							focusable="false"
																							data-prefix="far"
																							data-icon="chevron-down"
																							className="svg-inline--fa fa-chevron-down"
																							role="img"
																							xmlns="http://www.w3.org/2000/svg"
																							viewBox="0 0 512 512"
																						>
																							<path
																								fill="currentColor"
																								d="M239 401c9.4 9.4 24.6 9.4 33.9 0L465 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-175 175L81 175c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9L239 401z"
																							></path>
																						</svg>
																					</div>
																				</div>
																			</div>
																		</div>
																	</div>
																	<svg
																		aria-hidden="true"
																		focusable="false"
																		data-prefix="far"
																		data-icon="chevron-down"
																		className="svg-inline--fa fa-chevron-down fa-fw fa-xs text-textOff dark:text-textOffDark"
																		role="img"
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 512 512"
																	>
																		<path
																			fill="currentColor"
																			d="M239 401c9.4 9.4 24.6 9.4 33.9 0L465 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-175 175L81 175c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9L239 401z"
																		></path>
																	</svg>
																</div>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="md:hidden"></div>
								</div>
								<div className="rounded-inherit pointer-events-none absolute inset-0 z-10 hidden border md:dark:block border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent"></div>
							</div>
							<div className="fixed bottom-0 left-0 right-0 shadow-md md:hidden border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
								<div className="h-mobileNavHeight px-sm relative border-t border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
									<div className="w-full">
										<div className="items-center relative flex-1 w-full">
											<div className="flex w-full">
												<div className="items-center relative overflow-x-auto scrollbar-none flex-1 gap-x-md flex h-14 w-full">
													<div className="relative h-full flex items-center justify-center w-full border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
														<div className="justify-center px-xs">
															<Link
																role="button"
																aria-label="Home"
																className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark !px-0 hover:!bg-transparent hover:bg-offsetPlus text-textMain dark:text-textMainDark dark:hover:bg-offsetPlusDark py-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-start rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap flex w-full text-sm h-8 pl-2.5 pr-3"
																style={{
																	WebkitTapHighlightColor: "transparent",
																}}
																href="/"
															>
																<div className="flex items-center min-w-0 font-medium gap-1.5 justify-left w-full">
																	<div className="flex shrink-0 items-center justify-center size-4">
																		<svg
																			aria-hidden="true"
																			focusable="false"
																			data-prefix="fak"
																			data-icon="search"
																			className="svg-inline--fa fa-search fa-fw fa-1x"
																			role="img"
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 512 512"
																		>
																			<path
																				fill="currentColor"
																				d="M236.8 288a51.2 51.2 0 1 0 0-102.4 51.2 51.2 0 1 0 0 102.4zM434.9 398.7c-10.9 13.1-23 25.3-36.2 36.2l68.5 68.5 36.2-36.2-68.5-68.5zM236.8 32a204.8 204.8 0 1 1 0 409.6 204.8 204.8 0 1 1 0-409.6zm0 51.2a153.6 153.6 0 1 0 0 307.2 153.6 153.6 0 1 0 0-307.2z"
																			></path>
																		</svg>
																	</div>
																	<div className="text-align-center relative truncate leading-loose -mb-px">
																		Home
																	</div>
																</div>
															</Link>
															<div className="absolute bg-textMain dark:bg-textMainDark"></div>
														</div>
													</div>
													<div className="relative h-full flex items-center justify-center w-full border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
														<div className="justify-center px-xs">
															<a
																role="button"
																aria-label="Discover"
																className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark !px-0 hover:!bg-transparent hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark py-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-start rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap flex w-full text-sm h-8 pl-2.5 pr-3"
																style={{
																	WebkitTapHighlightColor: "transparent",
																}}
																href="/discover"
															>
																<div className="flex items-center min-w-0 font-medium gap-1.5 justify-left w-full">
																	<div className="flex shrink-0 items-center justify-center size-4">
																		<svg
																			aria-hidden="true"
																			focusable="false"
																			data-prefix="fak"
																			data-icon="discover"
																			className="svg-inline--fa fa-discover fa-fw fa-1x"
																			role="img"
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 640 512"
																		>
																			<path
																				fill="currentColor"
																				d="M320 51.2c6.4 0 19.2 17.3 30.4 51.2c4.8 14.1 9 31.4 12.5 51.2c2.9 15.4 5.1 32.3 6.4 51.2c1.3 16 1.9 33 1.9 51.2h51.2c0-17-.6-34.2-1.9-51.2c-1.3-17.3-3.2-34.6-5.8-51.2c-2.9-17.9-6.4-35.2-10.9-51.2c-3.8-13.8-8-26.6-13.1-38.4C374.1 25.3 350.7 0 320 0s-54.1 25.3-70.7 64c-5.1 11.5-9.3 24.6-13.1 38.4h53.8c11.2-33.9 23.7-51.2 30.4-51.2H320zm0 409.6c-6.4 0-19.2-17.3-30.4-51.2c-4.8-14.1-9-31.4-12.5-51.2c-2.9-15.4-5.1-32.3-6.4-51.2c-1.3-16-1.9-33-1.9-51.2H217.6c0 17 .6 34.2 1.9 51.2c1.3 17.3 3.2 34.6 5.8 51.2c2.9 17.9 6.4 35.2 10.9 51.2c3.8 13.8 8 26.6 13.1 38.4c16.6 38.7 40 64 70.7 64s54.1-25.3 70.7-64c5.1-11.5 9.3-24.6 13.1-38.4H350.1c-11.2 33.9-23.7 51.2-30.4 51.2h.3zM550.4 145.3c-7.4-15-16-29.4-26.2-42.9c-25-33-57.6-59.8-95.4-77.8C395.8 9 359 0 320 0s-75.8 9-108.8 24.6c-37.8 17.9-70.4 44.8-95.4 77.8c-9.9 13.4-18.9 27.5-26.2 42.9C73.3 178.9 64 216.3 64 256s9.3 77.1 25.6 110.7c7.4 15 16 29.4 26.2 42.9c25 33 57.6 59.8 95.4 77.8C244.2 503 281 512 320 512s75.8-9 108.8-24.6c37.8-17.9 70.4-44.8 95.4-77.8c9.9-13.4 18.9-27.5 26.2-42.9c16.3-33.6 25.6-71 25.6-110.7s-9.3-77.1-25.6-110.7zM390.7 448c-22.1 8.3-45.8 12.8-70.7 12.8s-48.6-4.8-70.7-12.8c-23.7-9-45.4-21.8-64.3-38.4c-1-.6-1.6-1.6-2.6-2.2c-15.7-14.1-29.1-30.7-39.7-49h30.4c-2.2-16.6-4.2-33.9-5.1-51.2H121.9c-4.2-16.3-6.7-33.6-6.7-51.2s2.6-34.9 6.7-51.2H320V153.6H143c10.6-18.2 24-34.9 39.7-49c1-.6 1.6-1.6 2.6-2.2C204.2 86.1 225.6 73 249.6 64c22.1-8.3 45.8-12.8 70.7-12.8s48.6 4.8 70.7 12.8c23.7 9 45.4 21.8 64.3 38.4c1 .6 1.6 1.6 2.6 2.2c15.7 14.1 29.1 30.7 39.7 49H467.2c2.2 16.6 4.2 33.9 5.1 51.2h46.1c4.2 16.3 6.7 33.6 6.7 51.2s-2.6 34.9-6.7 51.2H320.3v51.2h177c-10.6 18.2-24 34.9-39.7 49c-1 .6-1.6 1.6-2.6 2.2c-18.9 16.3-40.3 29.4-64.3 38.4z"
																			></path>
																		</svg>
																	</div>
																	<div className="text-align-center relative truncate leading-loose -mb-px">
																		Discover
																	</div>
																</div>
															</a>
														</div>
													</div>
													<div className="relative h-full flex items-center justify-center w-full border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
														<div className="justify-center px-xs">
															<a
																role="button"
																aria-label="Spaces"
																className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark !px-0 hover:!bg-transparent hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark py-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-start rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap flex w-full text-sm h-8 pl-2.5 pr-3"
																style={{
																	WebkitTapHighlightColor: "transparent",
																}}
																href="/spaces"
															>
																<div className="flex items-center min-w-0 font-medium gap-1.5 justify-left w-full">
																	<div className="flex shrink-0 items-center justify-center size-4">
																		<svg
																			aria-hidden="true"
																			focusable="false"
																			data-prefix="fak"
																			data-icon="collection-2"
																			className="svg-inline--fa fa-collection-2 fa-fw fa-1x"
																			role="img"
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 512 512"
																		>
																			<path
																				fill="currentColor"
																				d="M32 236.8V185.6c84.8 0 153.6-68.8 153.6-153.6h51.2C236.8 145 145 236.8 32 236.8zm460.8 0C379.8 236.8 288 145 288 32h51.2c0 84.8 68.8 153.6 153.6 153.6v51.2zm-256 256H185.6c0-84.8-68.8-153.6-153.6-153.6V288c113 0 204.8 91.8 204.8 204.8zm102.4 0H288c0-113 91.8-204.8 204.8-204.8v51.2c-84.8 0-153.6 68.8-153.6 153.6zM262.4 313.6a51.2 51.2 0 1 0 0-102.4 51.2 51.2 0 1 0 0 102.4z"
																			></path>
																		</svg>
																	</div>
																	<div className="text-align-center relative truncate leading-loose -mb-px">
																		Spaces
																	</div>
																</div>
															</a>
														</div>
													</div>
													<div className="relative h-full flex items-center justify-center w-full border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-transparent">
														<div className="justify-center px-xs">
															<a
																role="button"
																aria-label="Library"
																className="focus-visible:bg-offsetPlus dark:focus-visible:bg-offsetPlusDark !px-0 hover:!bg-transparent hover:bg-offsetPlus text-textOff dark:text-textOffDark hover:text-textMain dark:hover:bg-offsetPlusDark dark:hover:text-textMainDark py-md font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-start rounded-lg cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap flex w-full text-sm h-8 pl-2.5 pr-3"
																style={{
																	WebkitTapHighlightColor: "transparent",
																}}
																href="/library"
															>
																<div className="flex items-center min-w-0 font-medium gap-1.5 justify-left w-full">
																	<div className="flex shrink-0 items-center justify-center size-4">
																		<svg
																			aria-hidden="true"
																			focusable="false"
																			data-prefix="fak"
																			data-icon="library"
																			className="svg-inline--fa fa-library fa-fw fa-1x"
																			role="img"
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 512 512"
																		>
																			<path
																				fill="currentColor"
																				d="M512 281.6H460.8V256C460.8 143 369 51.2 256 51.2S51.2 143 51.2 256v25.6H0V256C0 114.9 114.9 0 256 0S512 114.9 512 256v25.6zm-102.4 0H358.4V256c0-56.3-46.1-102.4-102.4-102.4s-102.4 46.1-102.4 102.4v25.6H102.4V256c0-84.8 68.8-153.6 153.6-153.6s153.6 68.8 153.6 153.6v25.6zm-51.2 51.2c-41.9 0-79 20.5-102.4 51.8c-23.4-31.4-60.5-51.8-102.4-51.8H0V384H153.6c42.2 0 76.8 34.6 76.8 76.8v25.6h51.2V460.8c0-42.2 34.6-76.8 76.8-76.8H512V332.8H358.4zM256 307.2a51.2 51.2 0 1 0 0-102.4 51.2 51.2 0 1 0 0 102.4z"
																			></path>
																		</svg>
																	</div>
																	<div className="text-align-center relative truncate leading-loose -mb-px">
																		Library
																	</div>
																</div>
															</a>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="bottom-md right-md m-sm fixed hidden md:block">
					<div className="flex items-center gap-2">
						<span>
							<button
								aria-label="Help menu"
								type="button"
								className="bg-textMain text-textMainDark dark:bg-textMainDark dark:text-light-text hover:text-superDuper hover:dark:text-superDuper font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out font-sans select-none items-center relative group/button justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square"
							>
								<div className="flex items-center min-w-0 font-medium gap-1.5 justify-center">
									<div className="flex shrink-0 items-center justify-center size-4">
										<svg
											aria-hidden="true"
											focusable="false"
											data-prefix="fas"
											data-icon="question"
											className="svg-inline--fa fa-question fa-fw fa-1x"
											role="img"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 320 512"
										>
											<path
												fill="currentColor"
												d="M80 160c0-35.3 28.7-64 64-64l32 0c35.3 0 64 28.7 64 64l0 3.6c0 21.8-11.1 42.1-29.4 53.8l-42.2 27.1c-25.2 16.2-40.4 44.1-40.4 74l0 1.4c0 17.7 14.3 32 32 32s32-14.3 32-32l0-1.4c0-8.2 4.2-15.8 11-20.2l42.2-27.1c36.6-23.6 58.8-64.1 58.8-107.7l0-3.6c0-70.7-57.3-128-128-128l-32 0C73.3 32 16 89.3 16 160c0 17.7 14.3 32 32 32s32-14.3 32-32zm80 320a40 40 0 1 0 0-80 40 40 0 1 0 0 80z"
											></path>
										</svg>
									</div>
								</div>
							</button>
						</span>
					</div>
				</div>
			</main>

			{/* <div id="S:0">
				<div className="mt-lg">
					<div
						className="gap-sm grid grid-cols-6"
						style={{
							gridTemplateRows: "repeat(auto-fit, 64px)",
							gridAutoRows: "64px",
						}}
					>
						<div className="relative col-span-6 row-span-1">
							<a
								className="h-full w-full cursor-pointer"
								href="https://perplexity.ai/platforms"
								tabIndex={0}
								style={{ opacity: 1 }}
							>
								<div className="relative h-full w-full select-none overflow-hidden rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
									<div className="relative h-full w-full">
										<div className="grid h-full grid-cols-3 grid-rows-1">
											<div className="col-span-2">
												<div className="flex h-full flex-row items-center">
													<div className="p-sm flex h-full flex-col justify-center">
														<div className="gap-2xs p-xs flex flex-col items-start">
															<div className="line-clamp-2 text-ellipsis leading-tight default font-sans text-sm text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																Introducing our Windows App
															</div>
															<div className="line-clamp-2 text-ellipsis leading-tight light font-sans text-xs font-medium text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
																<span className="font-normal">
																	Install the native Windows App
																</span>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-span-1">
												<div className="relative h-full">
													<Image
														src="https://r2cdn.perplexity.ai/windows_light_simple.jpg"
														className="absolute inset-0 size-full object-cover object-center block dark:hidden"
														alt="Introducing our Windows App"
														style="
														mask-image: linear-gradient(
															to right,
															transparent,
															black 50%
														);
														-webkit-mask-image: linear-gradient(
															to right,
															transparent,
															black 50%
														);
													"
													/>
													<Image
														src="https://r2cdn.perplexity.ai/windows_dark_simple.jpg"
														className="absolute inset-0 size-full object-cover object-center hidden dark:block"
														alt="Introducing our Windows App"
														style="
														mask-image: linear-gradient(
															to right,
															transparent,
															black 50%
														);
														-webkit-mask-image: linear-gradient(
															to right,
															transparent,
															black 50%
														);
													"
													/>

													<Image
														src="https://r2cdn.perplexity.ai/windows_light_simple.jpg"
														className="absolute inset-0 size-full object-cover object-center block dark:hidden"
														alt="Introducing our Windows App"
														style={{
															maskImage:
																"linear-gradient(to right, transparent, black 50%)",
															WebkitMaskImage:
																"linear-gradient(to right, transparent, black 50%)",
														}}
														width={500} // ← required
														height={300} // ← required
													/>
													<Image
														src="https://r2cdn.perplexity.ai/windows_dark_simple.jpg"
														className="absolute inset-0 size-full object-cover object-center hidden dark:block"
														alt="Introducing our Windows App"
														style={{
															maskImage:
																"linear-gradient(to right, transparent, black 50%)",
															WebkitMaskImage:
																"linear-gradient(to right, transparent, black 50%)",
														}}
														width={500}
														height={300}
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
							</a>
						</div>
						<div className="relative col-span-2 row-span-1">
							<a
								className="h-full w-full cursor-pointer"
								href="/search/new?q=weather&amp;source=homepage_widget"
								tabIndex={0}
								style={{ opacity: 1 }}
							>
								<div className="relative h-full w-full select-none overflow-hidden rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
									<div className="gap-sm grid h-full w-full p-[12px] grid-rows-2">
										<div className="gap-sm flex flex-row items-center justify-between">
											<div className="leading-none line-clamp-1 min-w-max default font-sans text-base text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
												<div className="gap-sm flex flex-row">
													<svg
														aria-hidden="true"
														focusable="false"
														data-prefix="far"
														data-icon="sun"
														className="svg-inline--fa fa-sun fa-xs self-start"
														role="img"
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 512 512"
													>
														<path
															fill="currentColor"
															d="M375.7 19.7c-1.5-8-6.9-14.7-14.4-17.8s-16.1-2.2-22.8 2.4L256 61.1 173.5 4.2c-6.7-4.6-15.3-5.5-22.8-2.4s-12.9 9.8-14.4 17.8l-18.1 98.5L19.7 136.3c-8 1.5-14.7 6.9-17.8 14.4s-2.2 16.1 2.4 22.8L61.1 256 4.2 338.5c-4.6 6.7-5.5 15.3-2.4 22.8s9.8 13 17.8 14.4l98.5 18.1 18.1 98.5c1.5 8 6.9 14.7 14.4 17.8s16.1 2.2 22.8-2.4L256 450.9l82.5 56.9c6.7 4.6 15.3 5.5 22.8 2.4s12.9-9.8 14.4-17.8l18.1-98.5 98.5-18.1c8-1.5 14.7-6.9 17.8-14.4s2.2-16.1-2.4-22.8L450.9 256l56.9-82.5c4.6-6.7 5.5-15.3 2.4-22.8s-9.8-12.9-17.8-14.4l-98.5-18.1L375.7 19.7zM269.6 110l65.6-45.2 14.4 78.3c1.8 9.8 9.5 17.5 19.3 19.3l78.3 14.4L402 242.4c-5.7 8.2-5.7 19 0 27.2l45.2 65.6-78.3 14.4c-9.8 1.8-17.5 9.5-19.3 19.3l-14.4 78.3L269.6 402c-8.2-5.7-19-5.7-27.2 0l-65.6 45.2-14.4-78.3c-1.8-9.8-9.5-17.5-19.3-19.3L64.8 335.2 110 269.6c5.7-8.2 5.7-19 0-27.2L64.8 176.8l78.3-14.4c9.8-1.8 17.5-9.5 19.3-19.3l14.4-78.3L242.4 110c8.2 5.7 19 5.7 27.2 0zM256 368a112 112 0 1 0 0-224 112 112 0 1 0 0 224zM192 256a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z"
														></path>
													</svg>
													73°F
												</div>
											</div>
											<div className="leading-none line-clamp-1 light font-sans text-xs text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
												Sunny
											</div>
										</div>
										<div className="mt-xs gap-sm flex flex-row items-baseline justify-between">
											<div className="leading-none line-clamp-1 light font-sans text-xs text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
												Easter Cross
											</div>
											<div className="leading-none line-clamp-1 min-w-max ultraLight font-sans text-xs text-textOff/50 dark:text-textOffDark/50 selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
												H: 75° L: 58°
											</div>
										</div>
									</div>
								</div>
							</a>
						</div>
						<div className="relative col-span-2 row-span-1">
							<a
								className="h-full w-full cursor-pointer"
								href="/page/trump-s-trade-official-uninfor-VG42YQKCTHqXzBGQXGrg7Q"
								tabIndex={0}
								style={{ opacity: 1 }}
							>
								<div className="relative h-full w-full select-none overflow-hidden rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
									<div className="h-full w-full flex flex-row items-center">
										<div className="pl-[12px]">
											<div className="relative size-[40px] overflow-hidden rounded-md">
												<Image
													src="https://pplx-res.cloudinary.com/image/upload/t_thumbnail/v1744238629/getty_uploads/2209188153_e35s1k.jpg"
													alt="Trump&#x27;s Trade Official Uninformed on Tariff Pause"
													className="size-full object-cover"
												/>
											</div>
										</div>
										<div className="p-sm flex h-full flex-col justify-center pt-sm">
											<div className="px-xs line-clamp-2 text-ellipsis leading-tight default font-sans text-xs text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
												Trade Official Uninformed on Tariff Pause
											</div>
										</div>
									</div>
								</div>
							</a>
						</div>
						<div className="relative col-span-2 row-span-1">
							<div
								className="h-full w-full cursor-pointer"
								tabIndex={0}
								style={{ opacity: 1 }}
							>
								<div className="relative h-full w-full select-none overflow-hidden rounded-lg border-borderMain/50 ring-borderMain/50 divide-borderMain/50 dark:divide-borderMainDark/50 dark:ring-borderMainDark/50 dark:border-borderMainDark/50 bg-offset dark:bg-offsetDark">
									<div className="flex h-full flex-col items-start justify-between p-[12px]">
										<div className="gap-x-xs flex items-center">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="20"
												height="20"
												viewBox="0 0 24 24"
												fill="none"
												stroke="#8D9191"
												strokeWidth="1.8"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="tabler-icon tabler-icon-brand-dribbble"
											>
												<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
												<path d="M9 3.6c5 6 7 10.5 7.5 16.2"></path>
												<path d="M6.4 19c3.5 -3.5 6 -6.5 14.5 -6.4"></path>
												<path d="M3.1 10.75c5 0 9.814 -.38 15.314 -5"></path>
											</svg>
											<div className="light font-sans text-xs text-textOff dark:text-textOffDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
												Sports
											</div>
										</div>
										<div>
											<div className="default font-sans text-xs text-textMain dark:text-textMainDark selection:bg-super/50 selection:text-textMain dark:selection:bg-superDuper/10 dark:selection:text-superDark">
												Choose your teams
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div> */}
		</>
	);
}
