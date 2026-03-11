import { trace, Span, SpanStatusCode, Attributes } from "@opentelemetry/api";
import {
  AssemblyType,
  Assemblies,
  Severity,
  Notify,
} from "@evefrontier/dapp-kit";

/**
 * Centralized tracing utilities for the assembly dApp
 */

// Create centralized tracers
export const tracers = {
  actions: trace.getTracer("assembly-actions", "1.0.0"),
  editUnit: trace.getTracer("assembly-edit-unit", "1.0.0"),
  evenet: trace.getTracer("assembly-evenet-ops", "1.0.0"),
} as const;

/**
 * Standard attribute builders
 */
export const buildAssemblyAttributes = (
  assembly: AssemblyType<Assemblies>,
  additionalAttributes?: Attributes,
): Attributes => ({
  "assembly.id": assembly.id,
  "assembly.type": assembly.type,
  "assembly.state": assembly.state,
  // "user.address": wallet?.address || "unknown",
  ...additionalAttributes,
});

export const buildOperationAttributes = (
  operation: string,
  additionalAttributes?: Attributes,
): Attributes => ({
  "operation.type": operation,
  "user.action": operation,
  ...additionalAttributes,
});

/**
 * Wrapper for executing operations within a span with standardized error handling
 */
export const executeWithSpan = async <T>(
  tracer: ReturnType<typeof trace.getTracer>,
  spanName: string,
  attributes: Attributes,
  operation: (span: Span) => Promise<T> | T,
  startEvent?: string,
  successEvent?: string,
): Promise<T> => {
  return tracer.startActiveSpan(spanName, { attributes }, async (span) => {
    try {
      if (startEvent) {
        span.addEvent(startEvent);
      }

      const result = await operation(span);

      if (successEvent) {
        span.addEvent(successEvent);
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    } finally {
      span.end();
    }
  });
};

/**
 * Abstracted try/catch handler for encoding functions
 */
export const traceWithEncodingErrorHandling = async <T>(
  span: Span,
  operation: () => Promise<T>,
  notify: (args: Notify) => void,
): Promise<T> => {
  try {
    return await operation();
  } catch (err) {
    span.addEvent("Error during function encoding");

    // Replace with error handling for Sui

    span.recordException(err as Error);
    throw err;
  }
};

/**
 * Helper for evenet operation traces
 */
export const traceEvenetOperation = async <T>(
  operationName: string,
  assembly: AssemblyType<Assemblies>,
  operation: (span: Span) => Promise<T> | T,
  additionalAttributes?: Attributes,
): Promise<T> => {
  const attributes = buildAssemblyAttributes(assembly, {
    operation: operationName,
    ...additionalAttributes,
  });

  return executeWithSpan(
    tracers.evenet,
    `${operationName}-function`,
    attributes,
    operation,
    `Starting ${operationName} operation`,
  );
};

/**
 * Helper for child span operations
 */
export const traceChildOperation = async <T>(
  parentTracer: ReturnType<typeof trace.getTracer>,
  spanName: string,
  operation: (span: Span) => Promise<T> | T,
  attributes?: Attributes,
  startEvent?: string,
  successEvent?: string,
): Promise<T> => {
  return executeWithSpan(
    parentTracer,
    spanName,
    attributes || {},
    operation,
    startEvent,
    successEvent,
  );
};

/**
 * Helper for encoding operations
 */
export const traceEncodingOperation = async <T>(
  functionName: string,
  assemblyId: string,
  operation: (span: Span) => Promise<T> | T,
): Promise<T> => {
  return traceChildOperation(
    tracers.evenet,
    `encode-${functionName}-data`,
    operation,
    {
      "assembly.id": assemblyId,
      "function.name": functionName,
    },
    "Retrieving ABI item",
  );
};

/**
 * Helper for transaction operations
 */
export const traceTransactionOperation = async <T>(
  transactionType: string,
  assemblyId: string,
  operation: (span: Span) => Promise<T> | T,
  additionalAttributes?: Attributes,
): Promise<T> => {
  return traceChildOperation(
    tracers.editUnit,
    `send-${transactionType}-transaction`,
    operation,
    {
      "transaction.type": transactionType,
      "assembly.id": assemblyId,
      ...additionalAttributes,
    },
    "Initiating transaction",
    "Transaction handler called successfully",
  );
};

/**
 * Helper for UI event traces (field edits, interface actions, etc.)
 */
export const traceUIEvent = <T>(
  eventName: string,
  assembly: AssemblyType<Assemblies> | undefined,
  operation: (span: Span) => T,
  additionalAttributes?: Attributes,
): T => {
  const attributes = assembly
    ? buildAssemblyAttributes(assembly, additionalAttributes)
    : {
        // "user.address": walletClient?.account?.address || "unknown",
        ...additionalAttributes,
      };

  const span = tracers.editUnit.startSpan(eventName, { attributes });

  try {
    const result = operation(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  } finally {
    span.end();
  }
};

/**
 * Standardized event logging helpers
 */
export const logEvent = {
  systemIdResolved: (span: Span, systemId: string) =>
    span.addEvent("System ID resolved", { "system.id": systemId }),

  systemIdFailed: (span: Span) => {
    span.addEvent("System ID lookup failed");
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: "System ID not found",
    });
  },

  encodingSuccess: (span: Span, callDataLength: number) =>
    span.addEvent("Function data encoded successfully", {
      "callData.length": callDataLength,
    }),

  transactionSent: (span: Span, callData: string, systemId: string) =>
    span.addEvent("Sending transaction", {
      "callData.available": !!callData,
      "systemId.available": !!systemId,
    }),

  contractRevert: (span: Span, message: string) =>
    span.addEvent("Contract function reverted", { "error.message": message }),

  fieldUpdate: (
    span: Span,
    fieldType: string,
    value: string,
    isFirstEdit: boolean,
  ) =>
    span.addEvent("Field value updated", {
      "field.type": fieldType,
      "field.length": value.length,
      is_first_edit: isFirstEdit,
    }),
};
