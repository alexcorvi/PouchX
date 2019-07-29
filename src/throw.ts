/**
 * A helper function to throw consistent error messages
 */

export function transactionError(
	errorTitle: string,
	errorMessage: string,
	detailsTitle: string,
	details: string
) {
	throw new Error(
		`TRANSACTION-ERROR/${errorTitle.toUpperCase()}: ${errorMessage.toLowerCase()} / ${detailsTitle.toLowerCase()}: ${details.toLowerCase()}`
	);
}
