import { DatabaseSchemaResponse, ConnectionTest } from "../../../shared/schema";

export const testAndLoadConnection = async (
  connection: ConnectionTest
): Promise<DatabaseSchemaResponse> => {
  const response = await fetch("/api/connections/test-and-load", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(connection),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to connect to the database");
  }

  return response.json();
};

export const logAction = async (actionType: string, details?: object) => {
  try {
    await fetch(`http://localhost:5000/api/logs/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action_type: actionType, details }),
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};
