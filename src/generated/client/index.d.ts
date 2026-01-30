
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model JobApplication
 * 
 */
export type JobApplication = $Result.DefaultSelection<Prisma.$JobApplicationPayload>
/**
 * Model Applicant
 * 
 */
export type Applicant = $Result.DefaultSelection<Prisma.$ApplicantPayload>
/**
 * Model ApplicantEducation
 * 
 */
export type ApplicantEducation = $Result.DefaultSelection<Prisma.$ApplicantEducationPayload>
/**
 * Model ApplicantExperience
 * 
 */
export type ApplicantExperience = $Result.DefaultSelection<Prisma.$ApplicantExperiencePayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.jobApplication`: Exposes CRUD operations for the **JobApplication** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more JobApplications
    * const jobApplications = await prisma.jobApplication.findMany()
    * ```
    */
  get jobApplication(): Prisma.JobApplicationDelegate<ExtArgs>;

  /**
   * `prisma.applicant`: Exposes CRUD operations for the **Applicant** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Applicants
    * const applicants = await prisma.applicant.findMany()
    * ```
    */
  get applicant(): Prisma.ApplicantDelegate<ExtArgs>;

  /**
   * `prisma.applicantEducation`: Exposes CRUD operations for the **ApplicantEducation** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ApplicantEducations
    * const applicantEducations = await prisma.applicantEducation.findMany()
    * ```
    */
  get applicantEducation(): Prisma.ApplicantEducationDelegate<ExtArgs>;

  /**
   * `prisma.applicantExperience`: Exposes CRUD operations for the **ApplicantExperience** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ApplicantExperiences
    * const applicantExperiences = await prisma.applicantExperience.findMany()
    * ```
    */
  get applicantExperience(): Prisma.ApplicantExperienceDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    JobApplication: 'JobApplication',
    Applicant: 'Applicant',
    ApplicantEducation: 'ApplicantEducation',
    ApplicantExperience: 'ApplicantExperience'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "user" | "jobApplication" | "applicant" | "applicantEducation" | "applicantExperience"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      JobApplication: {
        payload: Prisma.$JobApplicationPayload<ExtArgs>
        fields: Prisma.JobApplicationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.JobApplicationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.JobApplicationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload>
          }
          findFirst: {
            args: Prisma.JobApplicationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.JobApplicationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload>
          }
          findMany: {
            args: Prisma.JobApplicationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload>[]
          }
          create: {
            args: Prisma.JobApplicationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload>
          }
          createMany: {
            args: Prisma.JobApplicationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.JobApplicationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload>[]
          }
          delete: {
            args: Prisma.JobApplicationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload>
          }
          update: {
            args: Prisma.JobApplicationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload>
          }
          deleteMany: {
            args: Prisma.JobApplicationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.JobApplicationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.JobApplicationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JobApplicationPayload>
          }
          aggregate: {
            args: Prisma.JobApplicationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateJobApplication>
          }
          groupBy: {
            args: Prisma.JobApplicationGroupByArgs<ExtArgs>
            result: $Utils.Optional<JobApplicationGroupByOutputType>[]
          }
          count: {
            args: Prisma.JobApplicationCountArgs<ExtArgs>
            result: $Utils.Optional<JobApplicationCountAggregateOutputType> | number
          }
        }
      }
      Applicant: {
        payload: Prisma.$ApplicantPayload<ExtArgs>
        fields: Prisma.ApplicantFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ApplicantFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ApplicantFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload>
          }
          findFirst: {
            args: Prisma.ApplicantFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ApplicantFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload>
          }
          findMany: {
            args: Prisma.ApplicantFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload>[]
          }
          create: {
            args: Prisma.ApplicantCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload>
          }
          createMany: {
            args: Prisma.ApplicantCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ApplicantCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload>[]
          }
          delete: {
            args: Prisma.ApplicantDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload>
          }
          update: {
            args: Prisma.ApplicantUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload>
          }
          deleteMany: {
            args: Prisma.ApplicantDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ApplicantUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ApplicantUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantPayload>
          }
          aggregate: {
            args: Prisma.ApplicantAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateApplicant>
          }
          groupBy: {
            args: Prisma.ApplicantGroupByArgs<ExtArgs>
            result: $Utils.Optional<ApplicantGroupByOutputType>[]
          }
          count: {
            args: Prisma.ApplicantCountArgs<ExtArgs>
            result: $Utils.Optional<ApplicantCountAggregateOutputType> | number
          }
        }
      }
      ApplicantEducation: {
        payload: Prisma.$ApplicantEducationPayload<ExtArgs>
        fields: Prisma.ApplicantEducationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ApplicantEducationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ApplicantEducationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload>
          }
          findFirst: {
            args: Prisma.ApplicantEducationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ApplicantEducationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload>
          }
          findMany: {
            args: Prisma.ApplicantEducationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload>[]
          }
          create: {
            args: Prisma.ApplicantEducationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload>
          }
          createMany: {
            args: Prisma.ApplicantEducationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ApplicantEducationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload>[]
          }
          delete: {
            args: Prisma.ApplicantEducationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload>
          }
          update: {
            args: Prisma.ApplicantEducationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload>
          }
          deleteMany: {
            args: Prisma.ApplicantEducationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ApplicantEducationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ApplicantEducationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantEducationPayload>
          }
          aggregate: {
            args: Prisma.ApplicantEducationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateApplicantEducation>
          }
          groupBy: {
            args: Prisma.ApplicantEducationGroupByArgs<ExtArgs>
            result: $Utils.Optional<ApplicantEducationGroupByOutputType>[]
          }
          count: {
            args: Prisma.ApplicantEducationCountArgs<ExtArgs>
            result: $Utils.Optional<ApplicantEducationCountAggregateOutputType> | number
          }
        }
      }
      ApplicantExperience: {
        payload: Prisma.$ApplicantExperiencePayload<ExtArgs>
        fields: Prisma.ApplicantExperienceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ApplicantExperienceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ApplicantExperienceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload>
          }
          findFirst: {
            args: Prisma.ApplicantExperienceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ApplicantExperienceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload>
          }
          findMany: {
            args: Prisma.ApplicantExperienceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload>[]
          }
          create: {
            args: Prisma.ApplicantExperienceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload>
          }
          createMany: {
            args: Prisma.ApplicantExperienceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ApplicantExperienceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload>[]
          }
          delete: {
            args: Prisma.ApplicantExperienceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload>
          }
          update: {
            args: Prisma.ApplicantExperienceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload>
          }
          deleteMany: {
            args: Prisma.ApplicantExperienceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ApplicantExperienceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ApplicantExperienceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicantExperiencePayload>
          }
          aggregate: {
            args: Prisma.ApplicantExperienceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateApplicantExperience>
          }
          groupBy: {
            args: Prisma.ApplicantExperienceGroupByArgs<ExtArgs>
            result: $Utils.Optional<ApplicantExperienceGroupByOutputType>[]
          }
          count: {
            args: Prisma.ApplicantExperienceCountArgs<ExtArgs>
            result: $Utils.Optional<ApplicantExperienceCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ApplicantCountOutputType
   */

  export type ApplicantCountOutputType = {
    educations: number
    experiences: number
  }

  export type ApplicantCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    educations?: boolean | ApplicantCountOutputTypeCountEducationsArgs
    experiences?: boolean | ApplicantCountOutputTypeCountExperiencesArgs
  }

  // Custom InputTypes
  /**
   * ApplicantCountOutputType without action
   */
  export type ApplicantCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantCountOutputType
     */
    select?: ApplicantCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ApplicantCountOutputType without action
   */
  export type ApplicantCountOutputTypeCountEducationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApplicantEducationWhereInput
  }

  /**
   * ApplicantCountOutputType without action
   */
  export type ApplicantCountOutputTypeCountExperiencesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApplicantExperienceWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    username: string | null
    password: string | null
    role: string | null
    name: string | null
    biometric_id: string | null
    fingerprint_data: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    username: string | null
    password: string | null
    role: string | null
    name: string | null
    biometric_id: string | null
    fingerprint_data: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    username: number
    password: number
    role: number
    name: number
    biometric_id: number
    fingerprint_data: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    username?: true
    password?: true
    role?: true
    name?: true
    biometric_id?: true
    fingerprint_data?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    username?: true
    password?: true
    role?: true
    name?: true
    biometric_id?: true
    fingerprint_data?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    username?: true
    password?: true
    role?: true
    name?: true
    biometric_id?: true
    fingerprint_data?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    username: string
    password: string
    role: string
    name: string | null
    biometric_id: string | null
    fingerprint_data: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    password?: boolean
    role?: boolean
    name?: boolean
    biometric_id?: boolean
    fingerprint_data?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    password?: boolean
    role?: boolean
    name?: boolean
    biometric_id?: boolean
    fingerprint_data?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    username?: boolean
    password?: boolean
    role?: boolean
    name?: boolean
    biometric_id?: boolean
    fingerprint_data?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      username: string
      password: string
      role: string
      name: string | null
      biometric_id: string | null
      fingerprint_data: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly username: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly biometric_id: FieldRef<"User", 'String'>
    readonly fingerprint_data: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
  }


  /**
   * Model JobApplication
   */

  export type AggregateJobApplication = {
    _count: JobApplicationCountAggregateOutputType | null
    _avg: JobApplicationAvgAggregateOutputType | null
    _sum: JobApplicationSumAggregateOutputType | null
    _min: JobApplicationMinAggregateOutputType | null
    _max: JobApplicationMaxAggregateOutputType | null
  }

  export type JobApplicationAvgAggregateOutputType = {
    id: number | null
  }

  export type JobApplicationSumAggregateOutputType = {
    id: number | null
  }

  export type JobApplicationMinAggregateOutputType = {
    id: number | null
    fullname_th: string | null
    position_applied: string | null
    salary_expected: string | null
    phone: string | null
    email: string | null
    photo_file: string | null
    resume_file: string | null
    created_at: Date | null
  }

  export type JobApplicationMaxAggregateOutputType = {
    id: number | null
    fullname_th: string | null
    position_applied: string | null
    salary_expected: string | null
    phone: string | null
    email: string | null
    photo_file: string | null
    resume_file: string | null
    created_at: Date | null
  }

  export type JobApplicationCountAggregateOutputType = {
    id: number
    fullname_th: number
    position_applied: number
    salary_expected: number
    phone: number
    email: number
    photo_file: number
    resume_file: number
    created_at: number
    _all: number
  }


  export type JobApplicationAvgAggregateInputType = {
    id?: true
  }

  export type JobApplicationSumAggregateInputType = {
    id?: true
  }

  export type JobApplicationMinAggregateInputType = {
    id?: true
    fullname_th?: true
    position_applied?: true
    salary_expected?: true
    phone?: true
    email?: true
    photo_file?: true
    resume_file?: true
    created_at?: true
  }

  export type JobApplicationMaxAggregateInputType = {
    id?: true
    fullname_th?: true
    position_applied?: true
    salary_expected?: true
    phone?: true
    email?: true
    photo_file?: true
    resume_file?: true
    created_at?: true
  }

  export type JobApplicationCountAggregateInputType = {
    id?: true
    fullname_th?: true
    position_applied?: true
    salary_expected?: true
    phone?: true
    email?: true
    photo_file?: true
    resume_file?: true
    created_at?: true
    _all?: true
  }

  export type JobApplicationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which JobApplication to aggregate.
     */
    where?: JobApplicationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of JobApplications to fetch.
     */
    orderBy?: JobApplicationOrderByWithRelationInput | JobApplicationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: JobApplicationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` JobApplications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` JobApplications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned JobApplications
    **/
    _count?: true | JobApplicationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: JobApplicationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: JobApplicationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: JobApplicationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: JobApplicationMaxAggregateInputType
  }

  export type GetJobApplicationAggregateType<T extends JobApplicationAggregateArgs> = {
        [P in keyof T & keyof AggregateJobApplication]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateJobApplication[P]>
      : GetScalarType<T[P], AggregateJobApplication[P]>
  }




  export type JobApplicationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: JobApplicationWhereInput
    orderBy?: JobApplicationOrderByWithAggregationInput | JobApplicationOrderByWithAggregationInput[]
    by: JobApplicationScalarFieldEnum[] | JobApplicationScalarFieldEnum
    having?: JobApplicationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: JobApplicationCountAggregateInputType | true
    _avg?: JobApplicationAvgAggregateInputType
    _sum?: JobApplicationSumAggregateInputType
    _min?: JobApplicationMinAggregateInputType
    _max?: JobApplicationMaxAggregateInputType
  }

  export type JobApplicationGroupByOutputType = {
    id: number
    fullname_th: string | null
    position_applied: string | null
    salary_expected: string | null
    phone: string | null
    email: string | null
    photo_file: string | null
    resume_file: string | null
    created_at: Date
    _count: JobApplicationCountAggregateOutputType | null
    _avg: JobApplicationAvgAggregateOutputType | null
    _sum: JobApplicationSumAggregateOutputType | null
    _min: JobApplicationMinAggregateOutputType | null
    _max: JobApplicationMaxAggregateOutputType | null
  }

  type GetJobApplicationGroupByPayload<T extends JobApplicationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<JobApplicationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof JobApplicationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], JobApplicationGroupByOutputType[P]>
            : GetScalarType<T[P], JobApplicationGroupByOutputType[P]>
        }
      >
    >


  export type JobApplicationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fullname_th?: boolean
    position_applied?: boolean
    salary_expected?: boolean
    phone?: boolean
    email?: boolean
    photo_file?: boolean
    resume_file?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["jobApplication"]>

  export type JobApplicationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fullname_th?: boolean
    position_applied?: boolean
    salary_expected?: boolean
    phone?: boolean
    email?: boolean
    photo_file?: boolean
    resume_file?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["jobApplication"]>

  export type JobApplicationSelectScalar = {
    id?: boolean
    fullname_th?: boolean
    position_applied?: boolean
    salary_expected?: boolean
    phone?: boolean
    email?: boolean
    photo_file?: boolean
    resume_file?: boolean
    created_at?: boolean
  }


  export type $JobApplicationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "JobApplication"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      fullname_th: string | null
      position_applied: string | null
      salary_expected: string | null
      phone: string | null
      email: string | null
      photo_file: string | null
      resume_file: string | null
      created_at: Date
    }, ExtArgs["result"]["jobApplication"]>
    composites: {}
  }

  type JobApplicationGetPayload<S extends boolean | null | undefined | JobApplicationDefaultArgs> = $Result.GetResult<Prisma.$JobApplicationPayload, S>

  type JobApplicationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<JobApplicationFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: JobApplicationCountAggregateInputType | true
    }

  export interface JobApplicationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['JobApplication'], meta: { name: 'JobApplication' } }
    /**
     * Find zero or one JobApplication that matches the filter.
     * @param {JobApplicationFindUniqueArgs} args - Arguments to find a JobApplication
     * @example
     * // Get one JobApplication
     * const jobApplication = await prisma.jobApplication.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends JobApplicationFindUniqueArgs>(args: SelectSubset<T, JobApplicationFindUniqueArgs<ExtArgs>>): Prisma__JobApplicationClient<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one JobApplication that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {JobApplicationFindUniqueOrThrowArgs} args - Arguments to find a JobApplication
     * @example
     * // Get one JobApplication
     * const jobApplication = await prisma.jobApplication.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends JobApplicationFindUniqueOrThrowArgs>(args: SelectSubset<T, JobApplicationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__JobApplicationClient<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first JobApplication that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JobApplicationFindFirstArgs} args - Arguments to find a JobApplication
     * @example
     * // Get one JobApplication
     * const jobApplication = await prisma.jobApplication.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends JobApplicationFindFirstArgs>(args?: SelectSubset<T, JobApplicationFindFirstArgs<ExtArgs>>): Prisma__JobApplicationClient<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first JobApplication that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JobApplicationFindFirstOrThrowArgs} args - Arguments to find a JobApplication
     * @example
     * // Get one JobApplication
     * const jobApplication = await prisma.jobApplication.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends JobApplicationFindFirstOrThrowArgs>(args?: SelectSubset<T, JobApplicationFindFirstOrThrowArgs<ExtArgs>>): Prisma__JobApplicationClient<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more JobApplications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JobApplicationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all JobApplications
     * const jobApplications = await prisma.jobApplication.findMany()
     * 
     * // Get first 10 JobApplications
     * const jobApplications = await prisma.jobApplication.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const jobApplicationWithIdOnly = await prisma.jobApplication.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends JobApplicationFindManyArgs>(args?: SelectSubset<T, JobApplicationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a JobApplication.
     * @param {JobApplicationCreateArgs} args - Arguments to create a JobApplication.
     * @example
     * // Create one JobApplication
     * const JobApplication = await prisma.jobApplication.create({
     *   data: {
     *     // ... data to create a JobApplication
     *   }
     * })
     * 
     */
    create<T extends JobApplicationCreateArgs>(args: SelectSubset<T, JobApplicationCreateArgs<ExtArgs>>): Prisma__JobApplicationClient<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many JobApplications.
     * @param {JobApplicationCreateManyArgs} args - Arguments to create many JobApplications.
     * @example
     * // Create many JobApplications
     * const jobApplication = await prisma.jobApplication.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends JobApplicationCreateManyArgs>(args?: SelectSubset<T, JobApplicationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many JobApplications and returns the data saved in the database.
     * @param {JobApplicationCreateManyAndReturnArgs} args - Arguments to create many JobApplications.
     * @example
     * // Create many JobApplications
     * const jobApplication = await prisma.jobApplication.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many JobApplications and only return the `id`
     * const jobApplicationWithIdOnly = await prisma.jobApplication.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends JobApplicationCreateManyAndReturnArgs>(args?: SelectSubset<T, JobApplicationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a JobApplication.
     * @param {JobApplicationDeleteArgs} args - Arguments to delete one JobApplication.
     * @example
     * // Delete one JobApplication
     * const JobApplication = await prisma.jobApplication.delete({
     *   where: {
     *     // ... filter to delete one JobApplication
     *   }
     * })
     * 
     */
    delete<T extends JobApplicationDeleteArgs>(args: SelectSubset<T, JobApplicationDeleteArgs<ExtArgs>>): Prisma__JobApplicationClient<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one JobApplication.
     * @param {JobApplicationUpdateArgs} args - Arguments to update one JobApplication.
     * @example
     * // Update one JobApplication
     * const jobApplication = await prisma.jobApplication.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends JobApplicationUpdateArgs>(args: SelectSubset<T, JobApplicationUpdateArgs<ExtArgs>>): Prisma__JobApplicationClient<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more JobApplications.
     * @param {JobApplicationDeleteManyArgs} args - Arguments to filter JobApplications to delete.
     * @example
     * // Delete a few JobApplications
     * const { count } = await prisma.jobApplication.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends JobApplicationDeleteManyArgs>(args?: SelectSubset<T, JobApplicationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more JobApplications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JobApplicationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many JobApplications
     * const jobApplication = await prisma.jobApplication.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends JobApplicationUpdateManyArgs>(args: SelectSubset<T, JobApplicationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one JobApplication.
     * @param {JobApplicationUpsertArgs} args - Arguments to update or create a JobApplication.
     * @example
     * // Update or create a JobApplication
     * const jobApplication = await prisma.jobApplication.upsert({
     *   create: {
     *     // ... data to create a JobApplication
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the JobApplication we want to update
     *   }
     * })
     */
    upsert<T extends JobApplicationUpsertArgs>(args: SelectSubset<T, JobApplicationUpsertArgs<ExtArgs>>): Prisma__JobApplicationClient<$Result.GetResult<Prisma.$JobApplicationPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of JobApplications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JobApplicationCountArgs} args - Arguments to filter JobApplications to count.
     * @example
     * // Count the number of JobApplications
     * const count = await prisma.jobApplication.count({
     *   where: {
     *     // ... the filter for the JobApplications we want to count
     *   }
     * })
    **/
    count<T extends JobApplicationCountArgs>(
      args?: Subset<T, JobApplicationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], JobApplicationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a JobApplication.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JobApplicationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends JobApplicationAggregateArgs>(args: Subset<T, JobApplicationAggregateArgs>): Prisma.PrismaPromise<GetJobApplicationAggregateType<T>>

    /**
     * Group by JobApplication.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JobApplicationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends JobApplicationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: JobApplicationGroupByArgs['orderBy'] }
        : { orderBy?: JobApplicationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, JobApplicationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetJobApplicationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the JobApplication model
   */
  readonly fields: JobApplicationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for JobApplication.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__JobApplicationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the JobApplication model
   */ 
  interface JobApplicationFieldRefs {
    readonly id: FieldRef<"JobApplication", 'Int'>
    readonly fullname_th: FieldRef<"JobApplication", 'String'>
    readonly position_applied: FieldRef<"JobApplication", 'String'>
    readonly salary_expected: FieldRef<"JobApplication", 'String'>
    readonly phone: FieldRef<"JobApplication", 'String'>
    readonly email: FieldRef<"JobApplication", 'String'>
    readonly photo_file: FieldRef<"JobApplication", 'String'>
    readonly resume_file: FieldRef<"JobApplication", 'String'>
    readonly created_at: FieldRef<"JobApplication", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * JobApplication findUnique
   */
  export type JobApplicationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * Filter, which JobApplication to fetch.
     */
    where: JobApplicationWhereUniqueInput
  }

  /**
   * JobApplication findUniqueOrThrow
   */
  export type JobApplicationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * Filter, which JobApplication to fetch.
     */
    where: JobApplicationWhereUniqueInput
  }

  /**
   * JobApplication findFirst
   */
  export type JobApplicationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * Filter, which JobApplication to fetch.
     */
    where?: JobApplicationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of JobApplications to fetch.
     */
    orderBy?: JobApplicationOrderByWithRelationInput | JobApplicationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for JobApplications.
     */
    cursor?: JobApplicationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` JobApplications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` JobApplications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of JobApplications.
     */
    distinct?: JobApplicationScalarFieldEnum | JobApplicationScalarFieldEnum[]
  }

  /**
   * JobApplication findFirstOrThrow
   */
  export type JobApplicationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * Filter, which JobApplication to fetch.
     */
    where?: JobApplicationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of JobApplications to fetch.
     */
    orderBy?: JobApplicationOrderByWithRelationInput | JobApplicationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for JobApplications.
     */
    cursor?: JobApplicationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` JobApplications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` JobApplications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of JobApplications.
     */
    distinct?: JobApplicationScalarFieldEnum | JobApplicationScalarFieldEnum[]
  }

  /**
   * JobApplication findMany
   */
  export type JobApplicationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * Filter, which JobApplications to fetch.
     */
    where?: JobApplicationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of JobApplications to fetch.
     */
    orderBy?: JobApplicationOrderByWithRelationInput | JobApplicationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing JobApplications.
     */
    cursor?: JobApplicationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` JobApplications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` JobApplications.
     */
    skip?: number
    distinct?: JobApplicationScalarFieldEnum | JobApplicationScalarFieldEnum[]
  }

  /**
   * JobApplication create
   */
  export type JobApplicationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * The data needed to create a JobApplication.
     */
    data?: XOR<JobApplicationCreateInput, JobApplicationUncheckedCreateInput>
  }

  /**
   * JobApplication createMany
   */
  export type JobApplicationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many JobApplications.
     */
    data: JobApplicationCreateManyInput | JobApplicationCreateManyInput[]
  }

  /**
   * JobApplication createManyAndReturn
   */
  export type JobApplicationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many JobApplications.
     */
    data: JobApplicationCreateManyInput | JobApplicationCreateManyInput[]
  }

  /**
   * JobApplication update
   */
  export type JobApplicationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * The data needed to update a JobApplication.
     */
    data: XOR<JobApplicationUpdateInput, JobApplicationUncheckedUpdateInput>
    /**
     * Choose, which JobApplication to update.
     */
    where: JobApplicationWhereUniqueInput
  }

  /**
   * JobApplication updateMany
   */
  export type JobApplicationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update JobApplications.
     */
    data: XOR<JobApplicationUpdateManyMutationInput, JobApplicationUncheckedUpdateManyInput>
    /**
     * Filter which JobApplications to update
     */
    where?: JobApplicationWhereInput
  }

  /**
   * JobApplication upsert
   */
  export type JobApplicationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * The filter to search for the JobApplication to update in case it exists.
     */
    where: JobApplicationWhereUniqueInput
    /**
     * In case the JobApplication found by the `where` argument doesn't exist, create a new JobApplication with this data.
     */
    create: XOR<JobApplicationCreateInput, JobApplicationUncheckedCreateInput>
    /**
     * In case the JobApplication was found with the provided `where` argument, update it with this data.
     */
    update: XOR<JobApplicationUpdateInput, JobApplicationUncheckedUpdateInput>
  }

  /**
   * JobApplication delete
   */
  export type JobApplicationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
    /**
     * Filter which JobApplication to delete.
     */
    where: JobApplicationWhereUniqueInput
  }

  /**
   * JobApplication deleteMany
   */
  export type JobApplicationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which JobApplications to delete
     */
    where?: JobApplicationWhereInput
  }

  /**
   * JobApplication without action
   */
  export type JobApplicationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JobApplication
     */
    select?: JobApplicationSelect<ExtArgs> | null
  }


  /**
   * Model Applicant
   */

  export type AggregateApplicant = {
    _count: ApplicantCountAggregateOutputType | null
    _avg: ApplicantAvgAggregateOutputType | null
    _sum: ApplicantSumAggregateOutputType | null
    _min: ApplicantMinAggregateOutputType | null
    _max: ApplicantMaxAggregateOutputType | null
  }

  export type ApplicantAvgAggregateOutputType = {
    expectedSalary: Decimal | null
    age: number | null
    livingDuration: number | null
    childrenCount: number | null
  }

  export type ApplicantSumAggregateOutputType = {
    expectedSalary: Decimal | null
    age: number | null
    livingDuration: number | null
    childrenCount: number | null
  }

  export type ApplicantMinAggregateOutputType = {
    id: string | null
    positionApplied: string | null
    expectedSalary: Decimal | null
    startDate: Date | null
    employmentStatus: string | null
    firstName: string | null
    lastName: string | null
    nickname: string | null
    dateOfBirth: Date | null
    age: number | null
    gender: string | null
    nationality: string | null
    religion: string | null
    race: string | null
    phone: string | null
    email: string | null
    address: string | null
    residenceType: string | null
    livingDuration: number | null
    maritalStatus: string | null
    militaryStatus: string | null
    childrenCount: number | null
    skills: string | null
    documents: string | null
    photoPath: string | null
    resumePath: string | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ApplicantMaxAggregateOutputType = {
    id: string | null
    positionApplied: string | null
    expectedSalary: Decimal | null
    startDate: Date | null
    employmentStatus: string | null
    firstName: string | null
    lastName: string | null
    nickname: string | null
    dateOfBirth: Date | null
    age: number | null
    gender: string | null
    nationality: string | null
    religion: string | null
    race: string | null
    phone: string | null
    email: string | null
    address: string | null
    residenceType: string | null
    livingDuration: number | null
    maritalStatus: string | null
    militaryStatus: string | null
    childrenCount: number | null
    skills: string | null
    documents: string | null
    photoPath: string | null
    resumePath: string | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ApplicantCountAggregateOutputType = {
    id: number
    positionApplied: number
    expectedSalary: number
    startDate: number
    employmentStatus: number
    firstName: number
    lastName: number
    nickname: number
    dateOfBirth: number
    age: number
    gender: number
    nationality: number
    religion: number
    race: number
    phone: number
    email: number
    address: number
    residenceType: number
    livingDuration: number
    maritalStatus: number
    militaryStatus: number
    childrenCount: number
    skills: number
    documents: number
    photoPath: number
    resumePath: number
    status: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ApplicantAvgAggregateInputType = {
    expectedSalary?: true
    age?: true
    livingDuration?: true
    childrenCount?: true
  }

  export type ApplicantSumAggregateInputType = {
    expectedSalary?: true
    age?: true
    livingDuration?: true
    childrenCount?: true
  }

  export type ApplicantMinAggregateInputType = {
    id?: true
    positionApplied?: true
    expectedSalary?: true
    startDate?: true
    employmentStatus?: true
    firstName?: true
    lastName?: true
    nickname?: true
    dateOfBirth?: true
    age?: true
    gender?: true
    nationality?: true
    religion?: true
    race?: true
    phone?: true
    email?: true
    address?: true
    residenceType?: true
    livingDuration?: true
    maritalStatus?: true
    militaryStatus?: true
    childrenCount?: true
    skills?: true
    documents?: true
    photoPath?: true
    resumePath?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ApplicantMaxAggregateInputType = {
    id?: true
    positionApplied?: true
    expectedSalary?: true
    startDate?: true
    employmentStatus?: true
    firstName?: true
    lastName?: true
    nickname?: true
    dateOfBirth?: true
    age?: true
    gender?: true
    nationality?: true
    religion?: true
    race?: true
    phone?: true
    email?: true
    address?: true
    residenceType?: true
    livingDuration?: true
    maritalStatus?: true
    militaryStatus?: true
    childrenCount?: true
    skills?: true
    documents?: true
    photoPath?: true
    resumePath?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ApplicantCountAggregateInputType = {
    id?: true
    positionApplied?: true
    expectedSalary?: true
    startDate?: true
    employmentStatus?: true
    firstName?: true
    lastName?: true
    nickname?: true
    dateOfBirth?: true
    age?: true
    gender?: true
    nationality?: true
    religion?: true
    race?: true
    phone?: true
    email?: true
    address?: true
    residenceType?: true
    livingDuration?: true
    maritalStatus?: true
    militaryStatus?: true
    childrenCount?: true
    skills?: true
    documents?: true
    photoPath?: true
    resumePath?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ApplicantAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Applicant to aggregate.
     */
    where?: ApplicantWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Applicants to fetch.
     */
    orderBy?: ApplicantOrderByWithRelationInput | ApplicantOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ApplicantWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Applicants from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Applicants.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Applicants
    **/
    _count?: true | ApplicantCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ApplicantAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ApplicantSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ApplicantMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ApplicantMaxAggregateInputType
  }

  export type GetApplicantAggregateType<T extends ApplicantAggregateArgs> = {
        [P in keyof T & keyof AggregateApplicant]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateApplicant[P]>
      : GetScalarType<T[P], AggregateApplicant[P]>
  }




  export type ApplicantGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApplicantWhereInput
    orderBy?: ApplicantOrderByWithAggregationInput | ApplicantOrderByWithAggregationInput[]
    by: ApplicantScalarFieldEnum[] | ApplicantScalarFieldEnum
    having?: ApplicantScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ApplicantCountAggregateInputType | true
    _avg?: ApplicantAvgAggregateInputType
    _sum?: ApplicantSumAggregateInputType
    _min?: ApplicantMinAggregateInputType
    _max?: ApplicantMaxAggregateInputType
  }

  export type ApplicantGroupByOutputType = {
    id: string
    positionApplied: string
    expectedSalary: Decimal | null
    startDate: Date | null
    employmentStatus: string | null
    firstName: string
    lastName: string
    nickname: string | null
    dateOfBirth: Date
    age: number
    gender: string | null
    nationality: string | null
    religion: string | null
    race: string | null
    phone: string
    email: string
    address: string
    residenceType: string | null
    livingDuration: number | null
    maritalStatus: string | null
    militaryStatus: string | null
    childrenCount: number
    skills: string | null
    documents: string | null
    photoPath: string | null
    resumePath: string | null
    status: string
    createdAt: Date
    updatedAt: Date
    _count: ApplicantCountAggregateOutputType | null
    _avg: ApplicantAvgAggregateOutputType | null
    _sum: ApplicantSumAggregateOutputType | null
    _min: ApplicantMinAggregateOutputType | null
    _max: ApplicantMaxAggregateOutputType | null
  }

  type GetApplicantGroupByPayload<T extends ApplicantGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ApplicantGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ApplicantGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ApplicantGroupByOutputType[P]>
            : GetScalarType<T[P], ApplicantGroupByOutputType[P]>
        }
      >
    >


  export type ApplicantSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    positionApplied?: boolean
    expectedSalary?: boolean
    startDate?: boolean
    employmentStatus?: boolean
    firstName?: boolean
    lastName?: boolean
    nickname?: boolean
    dateOfBirth?: boolean
    age?: boolean
    gender?: boolean
    nationality?: boolean
    religion?: boolean
    race?: boolean
    phone?: boolean
    email?: boolean
    address?: boolean
    residenceType?: boolean
    livingDuration?: boolean
    maritalStatus?: boolean
    militaryStatus?: boolean
    childrenCount?: boolean
    skills?: boolean
    documents?: boolean
    photoPath?: boolean
    resumePath?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    educations?: boolean | Applicant$educationsArgs<ExtArgs>
    experiences?: boolean | Applicant$experiencesArgs<ExtArgs>
    _count?: boolean | ApplicantCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["applicant"]>

  export type ApplicantSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    positionApplied?: boolean
    expectedSalary?: boolean
    startDate?: boolean
    employmentStatus?: boolean
    firstName?: boolean
    lastName?: boolean
    nickname?: boolean
    dateOfBirth?: boolean
    age?: boolean
    gender?: boolean
    nationality?: boolean
    religion?: boolean
    race?: boolean
    phone?: boolean
    email?: boolean
    address?: boolean
    residenceType?: boolean
    livingDuration?: boolean
    maritalStatus?: boolean
    militaryStatus?: boolean
    childrenCount?: boolean
    skills?: boolean
    documents?: boolean
    photoPath?: boolean
    resumePath?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["applicant"]>

  export type ApplicantSelectScalar = {
    id?: boolean
    positionApplied?: boolean
    expectedSalary?: boolean
    startDate?: boolean
    employmentStatus?: boolean
    firstName?: boolean
    lastName?: boolean
    nickname?: boolean
    dateOfBirth?: boolean
    age?: boolean
    gender?: boolean
    nationality?: boolean
    religion?: boolean
    race?: boolean
    phone?: boolean
    email?: boolean
    address?: boolean
    residenceType?: boolean
    livingDuration?: boolean
    maritalStatus?: boolean
    militaryStatus?: boolean
    childrenCount?: boolean
    skills?: boolean
    documents?: boolean
    photoPath?: boolean
    resumePath?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ApplicantInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    educations?: boolean | Applicant$educationsArgs<ExtArgs>
    experiences?: boolean | Applicant$experiencesArgs<ExtArgs>
    _count?: boolean | ApplicantCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ApplicantIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ApplicantPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Applicant"
    objects: {
      educations: Prisma.$ApplicantEducationPayload<ExtArgs>[]
      experiences: Prisma.$ApplicantExperiencePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      positionApplied: string
      expectedSalary: Prisma.Decimal | null
      startDate: Date | null
      employmentStatus: string | null
      firstName: string
      lastName: string
      nickname: string | null
      dateOfBirth: Date
      age: number
      gender: string | null
      nationality: string | null
      religion: string | null
      race: string | null
      phone: string
      email: string
      address: string
      residenceType: string | null
      livingDuration: number | null
      maritalStatus: string | null
      militaryStatus: string | null
      childrenCount: number
      skills: string | null
      documents: string | null
      photoPath: string | null
      resumePath: string | null
      status: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["applicant"]>
    composites: {}
  }

  type ApplicantGetPayload<S extends boolean | null | undefined | ApplicantDefaultArgs> = $Result.GetResult<Prisma.$ApplicantPayload, S>

  type ApplicantCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ApplicantFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ApplicantCountAggregateInputType | true
    }

  export interface ApplicantDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Applicant'], meta: { name: 'Applicant' } }
    /**
     * Find zero or one Applicant that matches the filter.
     * @param {ApplicantFindUniqueArgs} args - Arguments to find a Applicant
     * @example
     * // Get one Applicant
     * const applicant = await prisma.applicant.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ApplicantFindUniqueArgs>(args: SelectSubset<T, ApplicantFindUniqueArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Applicant that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ApplicantFindUniqueOrThrowArgs} args - Arguments to find a Applicant
     * @example
     * // Get one Applicant
     * const applicant = await prisma.applicant.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ApplicantFindUniqueOrThrowArgs>(args: SelectSubset<T, ApplicantFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Applicant that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantFindFirstArgs} args - Arguments to find a Applicant
     * @example
     * // Get one Applicant
     * const applicant = await prisma.applicant.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ApplicantFindFirstArgs>(args?: SelectSubset<T, ApplicantFindFirstArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Applicant that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantFindFirstOrThrowArgs} args - Arguments to find a Applicant
     * @example
     * // Get one Applicant
     * const applicant = await prisma.applicant.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ApplicantFindFirstOrThrowArgs>(args?: SelectSubset<T, ApplicantFindFirstOrThrowArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Applicants that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Applicants
     * const applicants = await prisma.applicant.findMany()
     * 
     * // Get first 10 Applicants
     * const applicants = await prisma.applicant.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const applicantWithIdOnly = await prisma.applicant.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ApplicantFindManyArgs>(args?: SelectSubset<T, ApplicantFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Applicant.
     * @param {ApplicantCreateArgs} args - Arguments to create a Applicant.
     * @example
     * // Create one Applicant
     * const Applicant = await prisma.applicant.create({
     *   data: {
     *     // ... data to create a Applicant
     *   }
     * })
     * 
     */
    create<T extends ApplicantCreateArgs>(args: SelectSubset<T, ApplicantCreateArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Applicants.
     * @param {ApplicantCreateManyArgs} args - Arguments to create many Applicants.
     * @example
     * // Create many Applicants
     * const applicant = await prisma.applicant.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ApplicantCreateManyArgs>(args?: SelectSubset<T, ApplicantCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Applicants and returns the data saved in the database.
     * @param {ApplicantCreateManyAndReturnArgs} args - Arguments to create many Applicants.
     * @example
     * // Create many Applicants
     * const applicant = await prisma.applicant.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Applicants and only return the `id`
     * const applicantWithIdOnly = await prisma.applicant.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ApplicantCreateManyAndReturnArgs>(args?: SelectSubset<T, ApplicantCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Applicant.
     * @param {ApplicantDeleteArgs} args - Arguments to delete one Applicant.
     * @example
     * // Delete one Applicant
     * const Applicant = await prisma.applicant.delete({
     *   where: {
     *     // ... filter to delete one Applicant
     *   }
     * })
     * 
     */
    delete<T extends ApplicantDeleteArgs>(args: SelectSubset<T, ApplicantDeleteArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Applicant.
     * @param {ApplicantUpdateArgs} args - Arguments to update one Applicant.
     * @example
     * // Update one Applicant
     * const applicant = await prisma.applicant.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ApplicantUpdateArgs>(args: SelectSubset<T, ApplicantUpdateArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Applicants.
     * @param {ApplicantDeleteManyArgs} args - Arguments to filter Applicants to delete.
     * @example
     * // Delete a few Applicants
     * const { count } = await prisma.applicant.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ApplicantDeleteManyArgs>(args?: SelectSubset<T, ApplicantDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Applicants.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Applicants
     * const applicant = await prisma.applicant.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ApplicantUpdateManyArgs>(args: SelectSubset<T, ApplicantUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Applicant.
     * @param {ApplicantUpsertArgs} args - Arguments to update or create a Applicant.
     * @example
     * // Update or create a Applicant
     * const applicant = await prisma.applicant.upsert({
     *   create: {
     *     // ... data to create a Applicant
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Applicant we want to update
     *   }
     * })
     */
    upsert<T extends ApplicantUpsertArgs>(args: SelectSubset<T, ApplicantUpsertArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Applicants.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantCountArgs} args - Arguments to filter Applicants to count.
     * @example
     * // Count the number of Applicants
     * const count = await prisma.applicant.count({
     *   where: {
     *     // ... the filter for the Applicants we want to count
     *   }
     * })
    **/
    count<T extends ApplicantCountArgs>(
      args?: Subset<T, ApplicantCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ApplicantCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Applicant.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ApplicantAggregateArgs>(args: Subset<T, ApplicantAggregateArgs>): Prisma.PrismaPromise<GetApplicantAggregateType<T>>

    /**
     * Group by Applicant.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ApplicantGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ApplicantGroupByArgs['orderBy'] }
        : { orderBy?: ApplicantGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ApplicantGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetApplicantGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Applicant model
   */
  readonly fields: ApplicantFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Applicant.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ApplicantClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    educations<T extends Applicant$educationsArgs<ExtArgs> = {}>(args?: Subset<T, Applicant$educationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "findMany"> | Null>
    experiences<T extends Applicant$experiencesArgs<ExtArgs> = {}>(args?: Subset<T, Applicant$experiencesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Applicant model
   */ 
  interface ApplicantFieldRefs {
    readonly id: FieldRef<"Applicant", 'String'>
    readonly positionApplied: FieldRef<"Applicant", 'String'>
    readonly expectedSalary: FieldRef<"Applicant", 'Decimal'>
    readonly startDate: FieldRef<"Applicant", 'DateTime'>
    readonly employmentStatus: FieldRef<"Applicant", 'String'>
    readonly firstName: FieldRef<"Applicant", 'String'>
    readonly lastName: FieldRef<"Applicant", 'String'>
    readonly nickname: FieldRef<"Applicant", 'String'>
    readonly dateOfBirth: FieldRef<"Applicant", 'DateTime'>
    readonly age: FieldRef<"Applicant", 'Int'>
    readonly gender: FieldRef<"Applicant", 'String'>
    readonly nationality: FieldRef<"Applicant", 'String'>
    readonly religion: FieldRef<"Applicant", 'String'>
    readonly race: FieldRef<"Applicant", 'String'>
    readonly phone: FieldRef<"Applicant", 'String'>
    readonly email: FieldRef<"Applicant", 'String'>
    readonly address: FieldRef<"Applicant", 'String'>
    readonly residenceType: FieldRef<"Applicant", 'String'>
    readonly livingDuration: FieldRef<"Applicant", 'Int'>
    readonly maritalStatus: FieldRef<"Applicant", 'String'>
    readonly militaryStatus: FieldRef<"Applicant", 'String'>
    readonly childrenCount: FieldRef<"Applicant", 'Int'>
    readonly skills: FieldRef<"Applicant", 'String'>
    readonly documents: FieldRef<"Applicant", 'String'>
    readonly photoPath: FieldRef<"Applicant", 'String'>
    readonly resumePath: FieldRef<"Applicant", 'String'>
    readonly status: FieldRef<"Applicant", 'String'>
    readonly createdAt: FieldRef<"Applicant", 'DateTime'>
    readonly updatedAt: FieldRef<"Applicant", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Applicant findUnique
   */
  export type ApplicantFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * Filter, which Applicant to fetch.
     */
    where: ApplicantWhereUniqueInput
  }

  /**
   * Applicant findUniqueOrThrow
   */
  export type ApplicantFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * Filter, which Applicant to fetch.
     */
    where: ApplicantWhereUniqueInput
  }

  /**
   * Applicant findFirst
   */
  export type ApplicantFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * Filter, which Applicant to fetch.
     */
    where?: ApplicantWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Applicants to fetch.
     */
    orderBy?: ApplicantOrderByWithRelationInput | ApplicantOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Applicants.
     */
    cursor?: ApplicantWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Applicants from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Applicants.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Applicants.
     */
    distinct?: ApplicantScalarFieldEnum | ApplicantScalarFieldEnum[]
  }

  /**
   * Applicant findFirstOrThrow
   */
  export type ApplicantFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * Filter, which Applicant to fetch.
     */
    where?: ApplicantWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Applicants to fetch.
     */
    orderBy?: ApplicantOrderByWithRelationInput | ApplicantOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Applicants.
     */
    cursor?: ApplicantWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Applicants from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Applicants.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Applicants.
     */
    distinct?: ApplicantScalarFieldEnum | ApplicantScalarFieldEnum[]
  }

  /**
   * Applicant findMany
   */
  export type ApplicantFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * Filter, which Applicants to fetch.
     */
    where?: ApplicantWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Applicants to fetch.
     */
    orderBy?: ApplicantOrderByWithRelationInput | ApplicantOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Applicants.
     */
    cursor?: ApplicantWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Applicants from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Applicants.
     */
    skip?: number
    distinct?: ApplicantScalarFieldEnum | ApplicantScalarFieldEnum[]
  }

  /**
   * Applicant create
   */
  export type ApplicantCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * The data needed to create a Applicant.
     */
    data: XOR<ApplicantCreateInput, ApplicantUncheckedCreateInput>
  }

  /**
   * Applicant createMany
   */
  export type ApplicantCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Applicants.
     */
    data: ApplicantCreateManyInput | ApplicantCreateManyInput[]
  }

  /**
   * Applicant createManyAndReturn
   */
  export type ApplicantCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Applicants.
     */
    data: ApplicantCreateManyInput | ApplicantCreateManyInput[]
  }

  /**
   * Applicant update
   */
  export type ApplicantUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * The data needed to update a Applicant.
     */
    data: XOR<ApplicantUpdateInput, ApplicantUncheckedUpdateInput>
    /**
     * Choose, which Applicant to update.
     */
    where: ApplicantWhereUniqueInput
  }

  /**
   * Applicant updateMany
   */
  export type ApplicantUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Applicants.
     */
    data: XOR<ApplicantUpdateManyMutationInput, ApplicantUncheckedUpdateManyInput>
    /**
     * Filter which Applicants to update
     */
    where?: ApplicantWhereInput
  }

  /**
   * Applicant upsert
   */
  export type ApplicantUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * The filter to search for the Applicant to update in case it exists.
     */
    where: ApplicantWhereUniqueInput
    /**
     * In case the Applicant found by the `where` argument doesn't exist, create a new Applicant with this data.
     */
    create: XOR<ApplicantCreateInput, ApplicantUncheckedCreateInput>
    /**
     * In case the Applicant was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ApplicantUpdateInput, ApplicantUncheckedUpdateInput>
  }

  /**
   * Applicant delete
   */
  export type ApplicantDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
    /**
     * Filter which Applicant to delete.
     */
    where: ApplicantWhereUniqueInput
  }

  /**
   * Applicant deleteMany
   */
  export type ApplicantDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Applicants to delete
     */
    where?: ApplicantWhereInput
  }

  /**
   * Applicant.educations
   */
  export type Applicant$educationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    where?: ApplicantEducationWhereInput
    orderBy?: ApplicantEducationOrderByWithRelationInput | ApplicantEducationOrderByWithRelationInput[]
    cursor?: ApplicantEducationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ApplicantEducationScalarFieldEnum | ApplicantEducationScalarFieldEnum[]
  }

  /**
   * Applicant.experiences
   */
  export type Applicant$experiencesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    where?: ApplicantExperienceWhereInput
    orderBy?: ApplicantExperienceOrderByWithRelationInput | ApplicantExperienceOrderByWithRelationInput[]
    cursor?: ApplicantExperienceWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ApplicantExperienceScalarFieldEnum | ApplicantExperienceScalarFieldEnum[]
  }

  /**
   * Applicant without action
   */
  export type ApplicantDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Applicant
     */
    select?: ApplicantSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantInclude<ExtArgs> | null
  }


  /**
   * Model ApplicantEducation
   */

  export type AggregateApplicantEducation = {
    _count: ApplicantEducationCountAggregateOutputType | null
    _avg: ApplicantEducationAvgAggregateOutputType | null
    _sum: ApplicantEducationSumAggregateOutputType | null
    _min: ApplicantEducationMinAggregateOutputType | null
    _max: ApplicantEducationMaxAggregateOutputType | null
  }

  export type ApplicantEducationAvgAggregateOutputType = {
    graduatedYear: number | null
    gpa: Decimal | null
  }

  export type ApplicantEducationSumAggregateOutputType = {
    graduatedYear: number | null
    gpa: Decimal | null
  }

  export type ApplicantEducationMinAggregateOutputType = {
    id: string | null
    applicantId: string | null
    level: string | null
    institution: string | null
    major: string | null
    graduatedYear: number | null
    gpa: Decimal | null
  }

  export type ApplicantEducationMaxAggregateOutputType = {
    id: string | null
    applicantId: string | null
    level: string | null
    institution: string | null
    major: string | null
    graduatedYear: number | null
    gpa: Decimal | null
  }

  export type ApplicantEducationCountAggregateOutputType = {
    id: number
    applicantId: number
    level: number
    institution: number
    major: number
    graduatedYear: number
    gpa: number
    _all: number
  }


  export type ApplicantEducationAvgAggregateInputType = {
    graduatedYear?: true
    gpa?: true
  }

  export type ApplicantEducationSumAggregateInputType = {
    graduatedYear?: true
    gpa?: true
  }

  export type ApplicantEducationMinAggregateInputType = {
    id?: true
    applicantId?: true
    level?: true
    institution?: true
    major?: true
    graduatedYear?: true
    gpa?: true
  }

  export type ApplicantEducationMaxAggregateInputType = {
    id?: true
    applicantId?: true
    level?: true
    institution?: true
    major?: true
    graduatedYear?: true
    gpa?: true
  }

  export type ApplicantEducationCountAggregateInputType = {
    id?: true
    applicantId?: true
    level?: true
    institution?: true
    major?: true
    graduatedYear?: true
    gpa?: true
    _all?: true
  }

  export type ApplicantEducationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApplicantEducation to aggregate.
     */
    where?: ApplicantEducationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicantEducations to fetch.
     */
    orderBy?: ApplicantEducationOrderByWithRelationInput | ApplicantEducationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ApplicantEducationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicantEducations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicantEducations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ApplicantEducations
    **/
    _count?: true | ApplicantEducationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ApplicantEducationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ApplicantEducationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ApplicantEducationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ApplicantEducationMaxAggregateInputType
  }

  export type GetApplicantEducationAggregateType<T extends ApplicantEducationAggregateArgs> = {
        [P in keyof T & keyof AggregateApplicantEducation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateApplicantEducation[P]>
      : GetScalarType<T[P], AggregateApplicantEducation[P]>
  }




  export type ApplicantEducationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApplicantEducationWhereInput
    orderBy?: ApplicantEducationOrderByWithAggregationInput | ApplicantEducationOrderByWithAggregationInput[]
    by: ApplicantEducationScalarFieldEnum[] | ApplicantEducationScalarFieldEnum
    having?: ApplicantEducationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ApplicantEducationCountAggregateInputType | true
    _avg?: ApplicantEducationAvgAggregateInputType
    _sum?: ApplicantEducationSumAggregateInputType
    _min?: ApplicantEducationMinAggregateInputType
    _max?: ApplicantEducationMaxAggregateInputType
  }

  export type ApplicantEducationGroupByOutputType = {
    id: string
    applicantId: string
    level: string
    institution: string
    major: string | null
    graduatedYear: number | null
    gpa: Decimal | null
    _count: ApplicantEducationCountAggregateOutputType | null
    _avg: ApplicantEducationAvgAggregateOutputType | null
    _sum: ApplicantEducationSumAggregateOutputType | null
    _min: ApplicantEducationMinAggregateOutputType | null
    _max: ApplicantEducationMaxAggregateOutputType | null
  }

  type GetApplicantEducationGroupByPayload<T extends ApplicantEducationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ApplicantEducationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ApplicantEducationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ApplicantEducationGroupByOutputType[P]>
            : GetScalarType<T[P], ApplicantEducationGroupByOutputType[P]>
        }
      >
    >


  export type ApplicantEducationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    applicantId?: boolean
    level?: boolean
    institution?: boolean
    major?: boolean
    graduatedYear?: boolean
    gpa?: boolean
    applicant?: boolean | ApplicantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["applicantEducation"]>

  export type ApplicantEducationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    applicantId?: boolean
    level?: boolean
    institution?: boolean
    major?: boolean
    graduatedYear?: boolean
    gpa?: boolean
    applicant?: boolean | ApplicantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["applicantEducation"]>

  export type ApplicantEducationSelectScalar = {
    id?: boolean
    applicantId?: boolean
    level?: boolean
    institution?: boolean
    major?: boolean
    graduatedYear?: boolean
    gpa?: boolean
  }

  export type ApplicantEducationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    applicant?: boolean | ApplicantDefaultArgs<ExtArgs>
  }
  export type ApplicantEducationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    applicant?: boolean | ApplicantDefaultArgs<ExtArgs>
  }

  export type $ApplicantEducationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ApplicantEducation"
    objects: {
      applicant: Prisma.$ApplicantPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      applicantId: string
      level: string
      institution: string
      major: string | null
      graduatedYear: number | null
      gpa: Prisma.Decimal | null
    }, ExtArgs["result"]["applicantEducation"]>
    composites: {}
  }

  type ApplicantEducationGetPayload<S extends boolean | null | undefined | ApplicantEducationDefaultArgs> = $Result.GetResult<Prisma.$ApplicantEducationPayload, S>

  type ApplicantEducationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ApplicantEducationFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ApplicantEducationCountAggregateInputType | true
    }

  export interface ApplicantEducationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ApplicantEducation'], meta: { name: 'ApplicantEducation' } }
    /**
     * Find zero or one ApplicantEducation that matches the filter.
     * @param {ApplicantEducationFindUniqueArgs} args - Arguments to find a ApplicantEducation
     * @example
     * // Get one ApplicantEducation
     * const applicantEducation = await prisma.applicantEducation.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ApplicantEducationFindUniqueArgs>(args: SelectSubset<T, ApplicantEducationFindUniqueArgs<ExtArgs>>): Prisma__ApplicantEducationClient<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ApplicantEducation that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ApplicantEducationFindUniqueOrThrowArgs} args - Arguments to find a ApplicantEducation
     * @example
     * // Get one ApplicantEducation
     * const applicantEducation = await prisma.applicantEducation.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ApplicantEducationFindUniqueOrThrowArgs>(args: SelectSubset<T, ApplicantEducationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ApplicantEducationClient<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ApplicantEducation that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantEducationFindFirstArgs} args - Arguments to find a ApplicantEducation
     * @example
     * // Get one ApplicantEducation
     * const applicantEducation = await prisma.applicantEducation.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ApplicantEducationFindFirstArgs>(args?: SelectSubset<T, ApplicantEducationFindFirstArgs<ExtArgs>>): Prisma__ApplicantEducationClient<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ApplicantEducation that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantEducationFindFirstOrThrowArgs} args - Arguments to find a ApplicantEducation
     * @example
     * // Get one ApplicantEducation
     * const applicantEducation = await prisma.applicantEducation.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ApplicantEducationFindFirstOrThrowArgs>(args?: SelectSubset<T, ApplicantEducationFindFirstOrThrowArgs<ExtArgs>>): Prisma__ApplicantEducationClient<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ApplicantEducations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantEducationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ApplicantEducations
     * const applicantEducations = await prisma.applicantEducation.findMany()
     * 
     * // Get first 10 ApplicantEducations
     * const applicantEducations = await prisma.applicantEducation.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const applicantEducationWithIdOnly = await prisma.applicantEducation.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ApplicantEducationFindManyArgs>(args?: SelectSubset<T, ApplicantEducationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ApplicantEducation.
     * @param {ApplicantEducationCreateArgs} args - Arguments to create a ApplicantEducation.
     * @example
     * // Create one ApplicantEducation
     * const ApplicantEducation = await prisma.applicantEducation.create({
     *   data: {
     *     // ... data to create a ApplicantEducation
     *   }
     * })
     * 
     */
    create<T extends ApplicantEducationCreateArgs>(args: SelectSubset<T, ApplicantEducationCreateArgs<ExtArgs>>): Prisma__ApplicantEducationClient<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ApplicantEducations.
     * @param {ApplicantEducationCreateManyArgs} args - Arguments to create many ApplicantEducations.
     * @example
     * // Create many ApplicantEducations
     * const applicantEducation = await prisma.applicantEducation.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ApplicantEducationCreateManyArgs>(args?: SelectSubset<T, ApplicantEducationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ApplicantEducations and returns the data saved in the database.
     * @param {ApplicantEducationCreateManyAndReturnArgs} args - Arguments to create many ApplicantEducations.
     * @example
     * // Create many ApplicantEducations
     * const applicantEducation = await prisma.applicantEducation.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ApplicantEducations and only return the `id`
     * const applicantEducationWithIdOnly = await prisma.applicantEducation.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ApplicantEducationCreateManyAndReturnArgs>(args?: SelectSubset<T, ApplicantEducationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ApplicantEducation.
     * @param {ApplicantEducationDeleteArgs} args - Arguments to delete one ApplicantEducation.
     * @example
     * // Delete one ApplicantEducation
     * const ApplicantEducation = await prisma.applicantEducation.delete({
     *   where: {
     *     // ... filter to delete one ApplicantEducation
     *   }
     * })
     * 
     */
    delete<T extends ApplicantEducationDeleteArgs>(args: SelectSubset<T, ApplicantEducationDeleteArgs<ExtArgs>>): Prisma__ApplicantEducationClient<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ApplicantEducation.
     * @param {ApplicantEducationUpdateArgs} args - Arguments to update one ApplicantEducation.
     * @example
     * // Update one ApplicantEducation
     * const applicantEducation = await prisma.applicantEducation.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ApplicantEducationUpdateArgs>(args: SelectSubset<T, ApplicantEducationUpdateArgs<ExtArgs>>): Prisma__ApplicantEducationClient<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ApplicantEducations.
     * @param {ApplicantEducationDeleteManyArgs} args - Arguments to filter ApplicantEducations to delete.
     * @example
     * // Delete a few ApplicantEducations
     * const { count } = await prisma.applicantEducation.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ApplicantEducationDeleteManyArgs>(args?: SelectSubset<T, ApplicantEducationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ApplicantEducations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantEducationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ApplicantEducations
     * const applicantEducation = await prisma.applicantEducation.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ApplicantEducationUpdateManyArgs>(args: SelectSubset<T, ApplicantEducationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ApplicantEducation.
     * @param {ApplicantEducationUpsertArgs} args - Arguments to update or create a ApplicantEducation.
     * @example
     * // Update or create a ApplicantEducation
     * const applicantEducation = await prisma.applicantEducation.upsert({
     *   create: {
     *     // ... data to create a ApplicantEducation
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ApplicantEducation we want to update
     *   }
     * })
     */
    upsert<T extends ApplicantEducationUpsertArgs>(args: SelectSubset<T, ApplicantEducationUpsertArgs<ExtArgs>>): Prisma__ApplicantEducationClient<$Result.GetResult<Prisma.$ApplicantEducationPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ApplicantEducations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantEducationCountArgs} args - Arguments to filter ApplicantEducations to count.
     * @example
     * // Count the number of ApplicantEducations
     * const count = await prisma.applicantEducation.count({
     *   where: {
     *     // ... the filter for the ApplicantEducations we want to count
     *   }
     * })
    **/
    count<T extends ApplicantEducationCountArgs>(
      args?: Subset<T, ApplicantEducationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ApplicantEducationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ApplicantEducation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantEducationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ApplicantEducationAggregateArgs>(args: Subset<T, ApplicantEducationAggregateArgs>): Prisma.PrismaPromise<GetApplicantEducationAggregateType<T>>

    /**
     * Group by ApplicantEducation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantEducationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ApplicantEducationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ApplicantEducationGroupByArgs['orderBy'] }
        : { orderBy?: ApplicantEducationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ApplicantEducationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetApplicantEducationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ApplicantEducation model
   */
  readonly fields: ApplicantEducationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ApplicantEducation.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ApplicantEducationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    applicant<T extends ApplicantDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ApplicantDefaultArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ApplicantEducation model
   */ 
  interface ApplicantEducationFieldRefs {
    readonly id: FieldRef<"ApplicantEducation", 'String'>
    readonly applicantId: FieldRef<"ApplicantEducation", 'String'>
    readonly level: FieldRef<"ApplicantEducation", 'String'>
    readonly institution: FieldRef<"ApplicantEducation", 'String'>
    readonly major: FieldRef<"ApplicantEducation", 'String'>
    readonly graduatedYear: FieldRef<"ApplicantEducation", 'Int'>
    readonly gpa: FieldRef<"ApplicantEducation", 'Decimal'>
  }
    

  // Custom InputTypes
  /**
   * ApplicantEducation findUnique
   */
  export type ApplicantEducationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantEducation to fetch.
     */
    where: ApplicantEducationWhereUniqueInput
  }

  /**
   * ApplicantEducation findUniqueOrThrow
   */
  export type ApplicantEducationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantEducation to fetch.
     */
    where: ApplicantEducationWhereUniqueInput
  }

  /**
   * ApplicantEducation findFirst
   */
  export type ApplicantEducationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantEducation to fetch.
     */
    where?: ApplicantEducationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicantEducations to fetch.
     */
    orderBy?: ApplicantEducationOrderByWithRelationInput | ApplicantEducationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApplicantEducations.
     */
    cursor?: ApplicantEducationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicantEducations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicantEducations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApplicantEducations.
     */
    distinct?: ApplicantEducationScalarFieldEnum | ApplicantEducationScalarFieldEnum[]
  }

  /**
   * ApplicantEducation findFirstOrThrow
   */
  export type ApplicantEducationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantEducation to fetch.
     */
    where?: ApplicantEducationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicantEducations to fetch.
     */
    orderBy?: ApplicantEducationOrderByWithRelationInput | ApplicantEducationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApplicantEducations.
     */
    cursor?: ApplicantEducationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicantEducations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicantEducations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApplicantEducations.
     */
    distinct?: ApplicantEducationScalarFieldEnum | ApplicantEducationScalarFieldEnum[]
  }

  /**
   * ApplicantEducation findMany
   */
  export type ApplicantEducationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantEducations to fetch.
     */
    where?: ApplicantEducationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicantEducations to fetch.
     */
    orderBy?: ApplicantEducationOrderByWithRelationInput | ApplicantEducationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ApplicantEducations.
     */
    cursor?: ApplicantEducationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicantEducations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicantEducations.
     */
    skip?: number
    distinct?: ApplicantEducationScalarFieldEnum | ApplicantEducationScalarFieldEnum[]
  }

  /**
   * ApplicantEducation create
   */
  export type ApplicantEducationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * The data needed to create a ApplicantEducation.
     */
    data: XOR<ApplicantEducationCreateInput, ApplicantEducationUncheckedCreateInput>
  }

  /**
   * ApplicantEducation createMany
   */
  export type ApplicantEducationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ApplicantEducations.
     */
    data: ApplicantEducationCreateManyInput | ApplicantEducationCreateManyInput[]
  }

  /**
   * ApplicantEducation createManyAndReturn
   */
  export type ApplicantEducationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ApplicantEducations.
     */
    data: ApplicantEducationCreateManyInput | ApplicantEducationCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ApplicantEducation update
   */
  export type ApplicantEducationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * The data needed to update a ApplicantEducation.
     */
    data: XOR<ApplicantEducationUpdateInput, ApplicantEducationUncheckedUpdateInput>
    /**
     * Choose, which ApplicantEducation to update.
     */
    where: ApplicantEducationWhereUniqueInput
  }

  /**
   * ApplicantEducation updateMany
   */
  export type ApplicantEducationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ApplicantEducations.
     */
    data: XOR<ApplicantEducationUpdateManyMutationInput, ApplicantEducationUncheckedUpdateManyInput>
    /**
     * Filter which ApplicantEducations to update
     */
    where?: ApplicantEducationWhereInput
  }

  /**
   * ApplicantEducation upsert
   */
  export type ApplicantEducationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * The filter to search for the ApplicantEducation to update in case it exists.
     */
    where: ApplicantEducationWhereUniqueInput
    /**
     * In case the ApplicantEducation found by the `where` argument doesn't exist, create a new ApplicantEducation with this data.
     */
    create: XOR<ApplicantEducationCreateInput, ApplicantEducationUncheckedCreateInput>
    /**
     * In case the ApplicantEducation was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ApplicantEducationUpdateInput, ApplicantEducationUncheckedUpdateInput>
  }

  /**
   * ApplicantEducation delete
   */
  export type ApplicantEducationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
    /**
     * Filter which ApplicantEducation to delete.
     */
    where: ApplicantEducationWhereUniqueInput
  }

  /**
   * ApplicantEducation deleteMany
   */
  export type ApplicantEducationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApplicantEducations to delete
     */
    where?: ApplicantEducationWhereInput
  }

  /**
   * ApplicantEducation without action
   */
  export type ApplicantEducationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantEducation
     */
    select?: ApplicantEducationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantEducationInclude<ExtArgs> | null
  }


  /**
   * Model ApplicantExperience
   */

  export type AggregateApplicantExperience = {
    _count: ApplicantExperienceCountAggregateOutputType | null
    _avg: ApplicantExperienceAvgAggregateOutputType | null
    _sum: ApplicantExperienceSumAggregateOutputType | null
    _min: ApplicantExperienceMinAggregateOutputType | null
    _max: ApplicantExperienceMaxAggregateOutputType | null
  }

  export type ApplicantExperienceAvgAggregateOutputType = {
    salary: Decimal | null
  }

  export type ApplicantExperienceSumAggregateOutputType = {
    salary: Decimal | null
  }

  export type ApplicantExperienceMinAggregateOutputType = {
    id: string | null
    applicantId: string | null
    company: string | null
    position: string | null
    salary: Decimal | null
    startDate: Date | null
    endDate: Date | null
    reasonForLeaving: string | null
  }

  export type ApplicantExperienceMaxAggregateOutputType = {
    id: string | null
    applicantId: string | null
    company: string | null
    position: string | null
    salary: Decimal | null
    startDate: Date | null
    endDate: Date | null
    reasonForLeaving: string | null
  }

  export type ApplicantExperienceCountAggregateOutputType = {
    id: number
    applicantId: number
    company: number
    position: number
    salary: number
    startDate: number
    endDate: number
    reasonForLeaving: number
    _all: number
  }


  export type ApplicantExperienceAvgAggregateInputType = {
    salary?: true
  }

  export type ApplicantExperienceSumAggregateInputType = {
    salary?: true
  }

  export type ApplicantExperienceMinAggregateInputType = {
    id?: true
    applicantId?: true
    company?: true
    position?: true
    salary?: true
    startDate?: true
    endDate?: true
    reasonForLeaving?: true
  }

  export type ApplicantExperienceMaxAggregateInputType = {
    id?: true
    applicantId?: true
    company?: true
    position?: true
    salary?: true
    startDate?: true
    endDate?: true
    reasonForLeaving?: true
  }

  export type ApplicantExperienceCountAggregateInputType = {
    id?: true
    applicantId?: true
    company?: true
    position?: true
    salary?: true
    startDate?: true
    endDate?: true
    reasonForLeaving?: true
    _all?: true
  }

  export type ApplicantExperienceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApplicantExperience to aggregate.
     */
    where?: ApplicantExperienceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicantExperiences to fetch.
     */
    orderBy?: ApplicantExperienceOrderByWithRelationInput | ApplicantExperienceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ApplicantExperienceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicantExperiences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicantExperiences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ApplicantExperiences
    **/
    _count?: true | ApplicantExperienceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ApplicantExperienceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ApplicantExperienceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ApplicantExperienceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ApplicantExperienceMaxAggregateInputType
  }

  export type GetApplicantExperienceAggregateType<T extends ApplicantExperienceAggregateArgs> = {
        [P in keyof T & keyof AggregateApplicantExperience]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateApplicantExperience[P]>
      : GetScalarType<T[P], AggregateApplicantExperience[P]>
  }




  export type ApplicantExperienceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApplicantExperienceWhereInput
    orderBy?: ApplicantExperienceOrderByWithAggregationInput | ApplicantExperienceOrderByWithAggregationInput[]
    by: ApplicantExperienceScalarFieldEnum[] | ApplicantExperienceScalarFieldEnum
    having?: ApplicantExperienceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ApplicantExperienceCountAggregateInputType | true
    _avg?: ApplicantExperienceAvgAggregateInputType
    _sum?: ApplicantExperienceSumAggregateInputType
    _min?: ApplicantExperienceMinAggregateInputType
    _max?: ApplicantExperienceMaxAggregateInputType
  }

  export type ApplicantExperienceGroupByOutputType = {
    id: string
    applicantId: string
    company: string
    position: string
    salary: Decimal | null
    startDate: Date | null
    endDate: Date | null
    reasonForLeaving: string | null
    _count: ApplicantExperienceCountAggregateOutputType | null
    _avg: ApplicantExperienceAvgAggregateOutputType | null
    _sum: ApplicantExperienceSumAggregateOutputType | null
    _min: ApplicantExperienceMinAggregateOutputType | null
    _max: ApplicantExperienceMaxAggregateOutputType | null
  }

  type GetApplicantExperienceGroupByPayload<T extends ApplicantExperienceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ApplicantExperienceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ApplicantExperienceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ApplicantExperienceGroupByOutputType[P]>
            : GetScalarType<T[P], ApplicantExperienceGroupByOutputType[P]>
        }
      >
    >


  export type ApplicantExperienceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    applicantId?: boolean
    company?: boolean
    position?: boolean
    salary?: boolean
    startDate?: boolean
    endDate?: boolean
    reasonForLeaving?: boolean
    applicant?: boolean | ApplicantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["applicantExperience"]>

  export type ApplicantExperienceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    applicantId?: boolean
    company?: boolean
    position?: boolean
    salary?: boolean
    startDate?: boolean
    endDate?: boolean
    reasonForLeaving?: boolean
    applicant?: boolean | ApplicantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["applicantExperience"]>

  export type ApplicantExperienceSelectScalar = {
    id?: boolean
    applicantId?: boolean
    company?: boolean
    position?: boolean
    salary?: boolean
    startDate?: boolean
    endDate?: boolean
    reasonForLeaving?: boolean
  }

  export type ApplicantExperienceInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    applicant?: boolean | ApplicantDefaultArgs<ExtArgs>
  }
  export type ApplicantExperienceIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    applicant?: boolean | ApplicantDefaultArgs<ExtArgs>
  }

  export type $ApplicantExperiencePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ApplicantExperience"
    objects: {
      applicant: Prisma.$ApplicantPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      applicantId: string
      company: string
      position: string
      salary: Prisma.Decimal | null
      startDate: Date | null
      endDate: Date | null
      reasonForLeaving: string | null
    }, ExtArgs["result"]["applicantExperience"]>
    composites: {}
  }

  type ApplicantExperienceGetPayload<S extends boolean | null | undefined | ApplicantExperienceDefaultArgs> = $Result.GetResult<Prisma.$ApplicantExperiencePayload, S>

  type ApplicantExperienceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ApplicantExperienceFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ApplicantExperienceCountAggregateInputType | true
    }

  export interface ApplicantExperienceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ApplicantExperience'], meta: { name: 'ApplicantExperience' } }
    /**
     * Find zero or one ApplicantExperience that matches the filter.
     * @param {ApplicantExperienceFindUniqueArgs} args - Arguments to find a ApplicantExperience
     * @example
     * // Get one ApplicantExperience
     * const applicantExperience = await prisma.applicantExperience.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ApplicantExperienceFindUniqueArgs>(args: SelectSubset<T, ApplicantExperienceFindUniqueArgs<ExtArgs>>): Prisma__ApplicantExperienceClient<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ApplicantExperience that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ApplicantExperienceFindUniqueOrThrowArgs} args - Arguments to find a ApplicantExperience
     * @example
     * // Get one ApplicantExperience
     * const applicantExperience = await prisma.applicantExperience.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ApplicantExperienceFindUniqueOrThrowArgs>(args: SelectSubset<T, ApplicantExperienceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ApplicantExperienceClient<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ApplicantExperience that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantExperienceFindFirstArgs} args - Arguments to find a ApplicantExperience
     * @example
     * // Get one ApplicantExperience
     * const applicantExperience = await prisma.applicantExperience.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ApplicantExperienceFindFirstArgs>(args?: SelectSubset<T, ApplicantExperienceFindFirstArgs<ExtArgs>>): Prisma__ApplicantExperienceClient<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ApplicantExperience that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantExperienceFindFirstOrThrowArgs} args - Arguments to find a ApplicantExperience
     * @example
     * // Get one ApplicantExperience
     * const applicantExperience = await prisma.applicantExperience.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ApplicantExperienceFindFirstOrThrowArgs>(args?: SelectSubset<T, ApplicantExperienceFindFirstOrThrowArgs<ExtArgs>>): Prisma__ApplicantExperienceClient<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ApplicantExperiences that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantExperienceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ApplicantExperiences
     * const applicantExperiences = await prisma.applicantExperience.findMany()
     * 
     * // Get first 10 ApplicantExperiences
     * const applicantExperiences = await prisma.applicantExperience.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const applicantExperienceWithIdOnly = await prisma.applicantExperience.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ApplicantExperienceFindManyArgs>(args?: SelectSubset<T, ApplicantExperienceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ApplicantExperience.
     * @param {ApplicantExperienceCreateArgs} args - Arguments to create a ApplicantExperience.
     * @example
     * // Create one ApplicantExperience
     * const ApplicantExperience = await prisma.applicantExperience.create({
     *   data: {
     *     // ... data to create a ApplicantExperience
     *   }
     * })
     * 
     */
    create<T extends ApplicantExperienceCreateArgs>(args: SelectSubset<T, ApplicantExperienceCreateArgs<ExtArgs>>): Prisma__ApplicantExperienceClient<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ApplicantExperiences.
     * @param {ApplicantExperienceCreateManyArgs} args - Arguments to create many ApplicantExperiences.
     * @example
     * // Create many ApplicantExperiences
     * const applicantExperience = await prisma.applicantExperience.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ApplicantExperienceCreateManyArgs>(args?: SelectSubset<T, ApplicantExperienceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ApplicantExperiences and returns the data saved in the database.
     * @param {ApplicantExperienceCreateManyAndReturnArgs} args - Arguments to create many ApplicantExperiences.
     * @example
     * // Create many ApplicantExperiences
     * const applicantExperience = await prisma.applicantExperience.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ApplicantExperiences and only return the `id`
     * const applicantExperienceWithIdOnly = await prisma.applicantExperience.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ApplicantExperienceCreateManyAndReturnArgs>(args?: SelectSubset<T, ApplicantExperienceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ApplicantExperience.
     * @param {ApplicantExperienceDeleteArgs} args - Arguments to delete one ApplicantExperience.
     * @example
     * // Delete one ApplicantExperience
     * const ApplicantExperience = await prisma.applicantExperience.delete({
     *   where: {
     *     // ... filter to delete one ApplicantExperience
     *   }
     * })
     * 
     */
    delete<T extends ApplicantExperienceDeleteArgs>(args: SelectSubset<T, ApplicantExperienceDeleteArgs<ExtArgs>>): Prisma__ApplicantExperienceClient<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ApplicantExperience.
     * @param {ApplicantExperienceUpdateArgs} args - Arguments to update one ApplicantExperience.
     * @example
     * // Update one ApplicantExperience
     * const applicantExperience = await prisma.applicantExperience.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ApplicantExperienceUpdateArgs>(args: SelectSubset<T, ApplicantExperienceUpdateArgs<ExtArgs>>): Prisma__ApplicantExperienceClient<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ApplicantExperiences.
     * @param {ApplicantExperienceDeleteManyArgs} args - Arguments to filter ApplicantExperiences to delete.
     * @example
     * // Delete a few ApplicantExperiences
     * const { count } = await prisma.applicantExperience.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ApplicantExperienceDeleteManyArgs>(args?: SelectSubset<T, ApplicantExperienceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ApplicantExperiences.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantExperienceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ApplicantExperiences
     * const applicantExperience = await prisma.applicantExperience.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ApplicantExperienceUpdateManyArgs>(args: SelectSubset<T, ApplicantExperienceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ApplicantExperience.
     * @param {ApplicantExperienceUpsertArgs} args - Arguments to update or create a ApplicantExperience.
     * @example
     * // Update or create a ApplicantExperience
     * const applicantExperience = await prisma.applicantExperience.upsert({
     *   create: {
     *     // ... data to create a ApplicantExperience
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ApplicantExperience we want to update
     *   }
     * })
     */
    upsert<T extends ApplicantExperienceUpsertArgs>(args: SelectSubset<T, ApplicantExperienceUpsertArgs<ExtArgs>>): Prisma__ApplicantExperienceClient<$Result.GetResult<Prisma.$ApplicantExperiencePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ApplicantExperiences.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantExperienceCountArgs} args - Arguments to filter ApplicantExperiences to count.
     * @example
     * // Count the number of ApplicantExperiences
     * const count = await prisma.applicantExperience.count({
     *   where: {
     *     // ... the filter for the ApplicantExperiences we want to count
     *   }
     * })
    **/
    count<T extends ApplicantExperienceCountArgs>(
      args?: Subset<T, ApplicantExperienceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ApplicantExperienceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ApplicantExperience.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantExperienceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ApplicantExperienceAggregateArgs>(args: Subset<T, ApplicantExperienceAggregateArgs>): Prisma.PrismaPromise<GetApplicantExperienceAggregateType<T>>

    /**
     * Group by ApplicantExperience.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicantExperienceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ApplicantExperienceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ApplicantExperienceGroupByArgs['orderBy'] }
        : { orderBy?: ApplicantExperienceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ApplicantExperienceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetApplicantExperienceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ApplicantExperience model
   */
  readonly fields: ApplicantExperienceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ApplicantExperience.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ApplicantExperienceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    applicant<T extends ApplicantDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ApplicantDefaultArgs<ExtArgs>>): Prisma__ApplicantClient<$Result.GetResult<Prisma.$ApplicantPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ApplicantExperience model
   */ 
  interface ApplicantExperienceFieldRefs {
    readonly id: FieldRef<"ApplicantExperience", 'String'>
    readonly applicantId: FieldRef<"ApplicantExperience", 'String'>
    readonly company: FieldRef<"ApplicantExperience", 'String'>
    readonly position: FieldRef<"ApplicantExperience", 'String'>
    readonly salary: FieldRef<"ApplicantExperience", 'Decimal'>
    readonly startDate: FieldRef<"ApplicantExperience", 'DateTime'>
    readonly endDate: FieldRef<"ApplicantExperience", 'DateTime'>
    readonly reasonForLeaving: FieldRef<"ApplicantExperience", 'String'>
  }
    

  // Custom InputTypes
  /**
   * ApplicantExperience findUnique
   */
  export type ApplicantExperienceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantExperience to fetch.
     */
    where: ApplicantExperienceWhereUniqueInput
  }

  /**
   * ApplicantExperience findUniqueOrThrow
   */
  export type ApplicantExperienceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantExperience to fetch.
     */
    where: ApplicantExperienceWhereUniqueInput
  }

  /**
   * ApplicantExperience findFirst
   */
  export type ApplicantExperienceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantExperience to fetch.
     */
    where?: ApplicantExperienceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicantExperiences to fetch.
     */
    orderBy?: ApplicantExperienceOrderByWithRelationInput | ApplicantExperienceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApplicantExperiences.
     */
    cursor?: ApplicantExperienceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicantExperiences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicantExperiences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApplicantExperiences.
     */
    distinct?: ApplicantExperienceScalarFieldEnum | ApplicantExperienceScalarFieldEnum[]
  }

  /**
   * ApplicantExperience findFirstOrThrow
   */
  export type ApplicantExperienceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantExperience to fetch.
     */
    where?: ApplicantExperienceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicantExperiences to fetch.
     */
    orderBy?: ApplicantExperienceOrderByWithRelationInput | ApplicantExperienceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApplicantExperiences.
     */
    cursor?: ApplicantExperienceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicantExperiences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicantExperiences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApplicantExperiences.
     */
    distinct?: ApplicantExperienceScalarFieldEnum | ApplicantExperienceScalarFieldEnum[]
  }

  /**
   * ApplicantExperience findMany
   */
  export type ApplicantExperienceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * Filter, which ApplicantExperiences to fetch.
     */
    where?: ApplicantExperienceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicantExperiences to fetch.
     */
    orderBy?: ApplicantExperienceOrderByWithRelationInput | ApplicantExperienceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ApplicantExperiences.
     */
    cursor?: ApplicantExperienceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicantExperiences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicantExperiences.
     */
    skip?: number
    distinct?: ApplicantExperienceScalarFieldEnum | ApplicantExperienceScalarFieldEnum[]
  }

  /**
   * ApplicantExperience create
   */
  export type ApplicantExperienceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * The data needed to create a ApplicantExperience.
     */
    data: XOR<ApplicantExperienceCreateInput, ApplicantExperienceUncheckedCreateInput>
  }

  /**
   * ApplicantExperience createMany
   */
  export type ApplicantExperienceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ApplicantExperiences.
     */
    data: ApplicantExperienceCreateManyInput | ApplicantExperienceCreateManyInput[]
  }

  /**
   * ApplicantExperience createManyAndReturn
   */
  export type ApplicantExperienceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ApplicantExperiences.
     */
    data: ApplicantExperienceCreateManyInput | ApplicantExperienceCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ApplicantExperience update
   */
  export type ApplicantExperienceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * The data needed to update a ApplicantExperience.
     */
    data: XOR<ApplicantExperienceUpdateInput, ApplicantExperienceUncheckedUpdateInput>
    /**
     * Choose, which ApplicantExperience to update.
     */
    where: ApplicantExperienceWhereUniqueInput
  }

  /**
   * ApplicantExperience updateMany
   */
  export type ApplicantExperienceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ApplicantExperiences.
     */
    data: XOR<ApplicantExperienceUpdateManyMutationInput, ApplicantExperienceUncheckedUpdateManyInput>
    /**
     * Filter which ApplicantExperiences to update
     */
    where?: ApplicantExperienceWhereInput
  }

  /**
   * ApplicantExperience upsert
   */
  export type ApplicantExperienceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * The filter to search for the ApplicantExperience to update in case it exists.
     */
    where: ApplicantExperienceWhereUniqueInput
    /**
     * In case the ApplicantExperience found by the `where` argument doesn't exist, create a new ApplicantExperience with this data.
     */
    create: XOR<ApplicantExperienceCreateInput, ApplicantExperienceUncheckedCreateInput>
    /**
     * In case the ApplicantExperience was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ApplicantExperienceUpdateInput, ApplicantExperienceUncheckedUpdateInput>
  }

  /**
   * ApplicantExperience delete
   */
  export type ApplicantExperienceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
    /**
     * Filter which ApplicantExperience to delete.
     */
    where: ApplicantExperienceWhereUniqueInput
  }

  /**
   * ApplicantExperience deleteMany
   */
  export type ApplicantExperienceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApplicantExperiences to delete
     */
    where?: ApplicantExperienceWhereInput
  }

  /**
   * ApplicantExperience without action
   */
  export type ApplicantExperienceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicantExperience
     */
    select?: ApplicantExperienceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicantExperienceInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    username: 'username',
    password: 'password',
    role: 'role',
    name: 'name',
    biometric_id: 'biometric_id',
    fingerprint_data: 'fingerprint_data',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const JobApplicationScalarFieldEnum: {
    id: 'id',
    fullname_th: 'fullname_th',
    position_applied: 'position_applied',
    salary_expected: 'salary_expected',
    phone: 'phone',
    email: 'email',
    photo_file: 'photo_file',
    resume_file: 'resume_file',
    created_at: 'created_at'
  };

  export type JobApplicationScalarFieldEnum = (typeof JobApplicationScalarFieldEnum)[keyof typeof JobApplicationScalarFieldEnum]


  export const ApplicantScalarFieldEnum: {
    id: 'id',
    positionApplied: 'positionApplied',
    expectedSalary: 'expectedSalary',
    startDate: 'startDate',
    employmentStatus: 'employmentStatus',
    firstName: 'firstName',
    lastName: 'lastName',
    nickname: 'nickname',
    dateOfBirth: 'dateOfBirth',
    age: 'age',
    gender: 'gender',
    nationality: 'nationality',
    religion: 'religion',
    race: 'race',
    phone: 'phone',
    email: 'email',
    address: 'address',
    residenceType: 'residenceType',
    livingDuration: 'livingDuration',
    maritalStatus: 'maritalStatus',
    militaryStatus: 'militaryStatus',
    childrenCount: 'childrenCount',
    skills: 'skills',
    documents: 'documents',
    photoPath: 'photoPath',
    resumePath: 'resumePath',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ApplicantScalarFieldEnum = (typeof ApplicantScalarFieldEnum)[keyof typeof ApplicantScalarFieldEnum]


  export const ApplicantEducationScalarFieldEnum: {
    id: 'id',
    applicantId: 'applicantId',
    level: 'level',
    institution: 'institution',
    major: 'major',
    graduatedYear: 'graduatedYear',
    gpa: 'gpa'
  };

  export type ApplicantEducationScalarFieldEnum = (typeof ApplicantEducationScalarFieldEnum)[keyof typeof ApplicantEducationScalarFieldEnum]


  export const ApplicantExperienceScalarFieldEnum: {
    id: 'id',
    applicantId: 'applicantId',
    company: 'company',
    position: 'position',
    salary: 'salary',
    startDate: 'startDate',
    endDate: 'endDate',
    reasonForLeaving: 'reasonForLeaving'
  };

  export type ApplicantExperienceScalarFieldEnum = (typeof ApplicantExperienceScalarFieldEnum)[keyof typeof ApplicantExperienceScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    username?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    name?: StringNullableFilter<"User"> | string | null
    biometric_id?: StringNullableFilter<"User"> | string | null
    fingerprint_data?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrder
    name?: SortOrderInput | SortOrder
    biometric_id?: SortOrderInput | SortOrder
    fingerprint_data?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    username?: string
    biometric_id?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    password?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    name?: StringNullableFilter<"User"> | string | null
    fingerprint_data?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
  }, "id" | "username" | "biometric_id">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrder
    name?: SortOrderInput | SortOrder
    biometric_id?: SortOrderInput | SortOrder
    fingerprint_data?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    username?: StringWithAggregatesFilter<"User"> | string
    password?: StringWithAggregatesFilter<"User"> | string
    role?: StringWithAggregatesFilter<"User"> | string
    name?: StringNullableWithAggregatesFilter<"User"> | string | null
    biometric_id?: StringNullableWithAggregatesFilter<"User"> | string | null
    fingerprint_data?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type JobApplicationWhereInput = {
    AND?: JobApplicationWhereInput | JobApplicationWhereInput[]
    OR?: JobApplicationWhereInput[]
    NOT?: JobApplicationWhereInput | JobApplicationWhereInput[]
    id?: IntFilter<"JobApplication"> | number
    fullname_th?: StringNullableFilter<"JobApplication"> | string | null
    position_applied?: StringNullableFilter<"JobApplication"> | string | null
    salary_expected?: StringNullableFilter<"JobApplication"> | string | null
    phone?: StringNullableFilter<"JobApplication"> | string | null
    email?: StringNullableFilter<"JobApplication"> | string | null
    photo_file?: StringNullableFilter<"JobApplication"> | string | null
    resume_file?: StringNullableFilter<"JobApplication"> | string | null
    created_at?: DateTimeFilter<"JobApplication"> | Date | string
  }

  export type JobApplicationOrderByWithRelationInput = {
    id?: SortOrder
    fullname_th?: SortOrderInput | SortOrder
    position_applied?: SortOrderInput | SortOrder
    salary_expected?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    photo_file?: SortOrderInput | SortOrder
    resume_file?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type JobApplicationWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: JobApplicationWhereInput | JobApplicationWhereInput[]
    OR?: JobApplicationWhereInput[]
    NOT?: JobApplicationWhereInput | JobApplicationWhereInput[]
    fullname_th?: StringNullableFilter<"JobApplication"> | string | null
    position_applied?: StringNullableFilter<"JobApplication"> | string | null
    salary_expected?: StringNullableFilter<"JobApplication"> | string | null
    phone?: StringNullableFilter<"JobApplication"> | string | null
    email?: StringNullableFilter<"JobApplication"> | string | null
    photo_file?: StringNullableFilter<"JobApplication"> | string | null
    resume_file?: StringNullableFilter<"JobApplication"> | string | null
    created_at?: DateTimeFilter<"JobApplication"> | Date | string
  }, "id">

  export type JobApplicationOrderByWithAggregationInput = {
    id?: SortOrder
    fullname_th?: SortOrderInput | SortOrder
    position_applied?: SortOrderInput | SortOrder
    salary_expected?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    photo_file?: SortOrderInput | SortOrder
    resume_file?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: JobApplicationCountOrderByAggregateInput
    _avg?: JobApplicationAvgOrderByAggregateInput
    _max?: JobApplicationMaxOrderByAggregateInput
    _min?: JobApplicationMinOrderByAggregateInput
    _sum?: JobApplicationSumOrderByAggregateInput
  }

  export type JobApplicationScalarWhereWithAggregatesInput = {
    AND?: JobApplicationScalarWhereWithAggregatesInput | JobApplicationScalarWhereWithAggregatesInput[]
    OR?: JobApplicationScalarWhereWithAggregatesInput[]
    NOT?: JobApplicationScalarWhereWithAggregatesInput | JobApplicationScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"JobApplication"> | number
    fullname_th?: StringNullableWithAggregatesFilter<"JobApplication"> | string | null
    position_applied?: StringNullableWithAggregatesFilter<"JobApplication"> | string | null
    salary_expected?: StringNullableWithAggregatesFilter<"JobApplication"> | string | null
    phone?: StringNullableWithAggregatesFilter<"JobApplication"> | string | null
    email?: StringNullableWithAggregatesFilter<"JobApplication"> | string | null
    photo_file?: StringNullableWithAggregatesFilter<"JobApplication"> | string | null
    resume_file?: StringNullableWithAggregatesFilter<"JobApplication"> | string | null
    created_at?: DateTimeWithAggregatesFilter<"JobApplication"> | Date | string
  }

  export type ApplicantWhereInput = {
    AND?: ApplicantWhereInput | ApplicantWhereInput[]
    OR?: ApplicantWhereInput[]
    NOT?: ApplicantWhereInput | ApplicantWhereInput[]
    id?: StringFilter<"Applicant"> | string
    positionApplied?: StringFilter<"Applicant"> | string
    expectedSalary?: DecimalNullableFilter<"Applicant"> | Decimal | DecimalJsLike | number | string | null
    startDate?: DateTimeNullableFilter<"Applicant"> | Date | string | null
    employmentStatus?: StringNullableFilter<"Applicant"> | string | null
    firstName?: StringFilter<"Applicant"> | string
    lastName?: StringFilter<"Applicant"> | string
    nickname?: StringNullableFilter<"Applicant"> | string | null
    dateOfBirth?: DateTimeFilter<"Applicant"> | Date | string
    age?: IntFilter<"Applicant"> | number
    gender?: StringNullableFilter<"Applicant"> | string | null
    nationality?: StringNullableFilter<"Applicant"> | string | null
    religion?: StringNullableFilter<"Applicant"> | string | null
    race?: StringNullableFilter<"Applicant"> | string | null
    phone?: StringFilter<"Applicant"> | string
    email?: StringFilter<"Applicant"> | string
    address?: StringFilter<"Applicant"> | string
    residenceType?: StringNullableFilter<"Applicant"> | string | null
    livingDuration?: IntNullableFilter<"Applicant"> | number | null
    maritalStatus?: StringNullableFilter<"Applicant"> | string | null
    militaryStatus?: StringNullableFilter<"Applicant"> | string | null
    childrenCount?: IntFilter<"Applicant"> | number
    skills?: StringNullableFilter<"Applicant"> | string | null
    documents?: StringNullableFilter<"Applicant"> | string | null
    photoPath?: StringNullableFilter<"Applicant"> | string | null
    resumePath?: StringNullableFilter<"Applicant"> | string | null
    status?: StringFilter<"Applicant"> | string
    createdAt?: DateTimeFilter<"Applicant"> | Date | string
    updatedAt?: DateTimeFilter<"Applicant"> | Date | string
    educations?: ApplicantEducationListRelationFilter
    experiences?: ApplicantExperienceListRelationFilter
  }

  export type ApplicantOrderByWithRelationInput = {
    id?: SortOrder
    positionApplied?: SortOrder
    expectedSalary?: SortOrderInput | SortOrder
    startDate?: SortOrderInput | SortOrder
    employmentStatus?: SortOrderInput | SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    nickname?: SortOrderInput | SortOrder
    dateOfBirth?: SortOrder
    age?: SortOrder
    gender?: SortOrderInput | SortOrder
    nationality?: SortOrderInput | SortOrder
    religion?: SortOrderInput | SortOrder
    race?: SortOrderInput | SortOrder
    phone?: SortOrder
    email?: SortOrder
    address?: SortOrder
    residenceType?: SortOrderInput | SortOrder
    livingDuration?: SortOrderInput | SortOrder
    maritalStatus?: SortOrderInput | SortOrder
    militaryStatus?: SortOrderInput | SortOrder
    childrenCount?: SortOrder
    skills?: SortOrderInput | SortOrder
    documents?: SortOrderInput | SortOrder
    photoPath?: SortOrderInput | SortOrder
    resumePath?: SortOrderInput | SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    educations?: ApplicantEducationOrderByRelationAggregateInput
    experiences?: ApplicantExperienceOrderByRelationAggregateInput
  }

  export type ApplicantWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: ApplicantWhereInput | ApplicantWhereInput[]
    OR?: ApplicantWhereInput[]
    NOT?: ApplicantWhereInput | ApplicantWhereInput[]
    positionApplied?: StringFilter<"Applicant"> | string
    expectedSalary?: DecimalNullableFilter<"Applicant"> | Decimal | DecimalJsLike | number | string | null
    startDate?: DateTimeNullableFilter<"Applicant"> | Date | string | null
    employmentStatus?: StringNullableFilter<"Applicant"> | string | null
    firstName?: StringFilter<"Applicant"> | string
    lastName?: StringFilter<"Applicant"> | string
    nickname?: StringNullableFilter<"Applicant"> | string | null
    dateOfBirth?: DateTimeFilter<"Applicant"> | Date | string
    age?: IntFilter<"Applicant"> | number
    gender?: StringNullableFilter<"Applicant"> | string | null
    nationality?: StringNullableFilter<"Applicant"> | string | null
    religion?: StringNullableFilter<"Applicant"> | string | null
    race?: StringNullableFilter<"Applicant"> | string | null
    phone?: StringFilter<"Applicant"> | string
    address?: StringFilter<"Applicant"> | string
    residenceType?: StringNullableFilter<"Applicant"> | string | null
    livingDuration?: IntNullableFilter<"Applicant"> | number | null
    maritalStatus?: StringNullableFilter<"Applicant"> | string | null
    militaryStatus?: StringNullableFilter<"Applicant"> | string | null
    childrenCount?: IntFilter<"Applicant"> | number
    skills?: StringNullableFilter<"Applicant"> | string | null
    documents?: StringNullableFilter<"Applicant"> | string | null
    photoPath?: StringNullableFilter<"Applicant"> | string | null
    resumePath?: StringNullableFilter<"Applicant"> | string | null
    status?: StringFilter<"Applicant"> | string
    createdAt?: DateTimeFilter<"Applicant"> | Date | string
    updatedAt?: DateTimeFilter<"Applicant"> | Date | string
    educations?: ApplicantEducationListRelationFilter
    experiences?: ApplicantExperienceListRelationFilter
  }, "id" | "email">

  export type ApplicantOrderByWithAggregationInput = {
    id?: SortOrder
    positionApplied?: SortOrder
    expectedSalary?: SortOrderInput | SortOrder
    startDate?: SortOrderInput | SortOrder
    employmentStatus?: SortOrderInput | SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    nickname?: SortOrderInput | SortOrder
    dateOfBirth?: SortOrder
    age?: SortOrder
    gender?: SortOrderInput | SortOrder
    nationality?: SortOrderInput | SortOrder
    religion?: SortOrderInput | SortOrder
    race?: SortOrderInput | SortOrder
    phone?: SortOrder
    email?: SortOrder
    address?: SortOrder
    residenceType?: SortOrderInput | SortOrder
    livingDuration?: SortOrderInput | SortOrder
    maritalStatus?: SortOrderInput | SortOrder
    militaryStatus?: SortOrderInput | SortOrder
    childrenCount?: SortOrder
    skills?: SortOrderInput | SortOrder
    documents?: SortOrderInput | SortOrder
    photoPath?: SortOrderInput | SortOrder
    resumePath?: SortOrderInput | SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ApplicantCountOrderByAggregateInput
    _avg?: ApplicantAvgOrderByAggregateInput
    _max?: ApplicantMaxOrderByAggregateInput
    _min?: ApplicantMinOrderByAggregateInput
    _sum?: ApplicantSumOrderByAggregateInput
  }

  export type ApplicantScalarWhereWithAggregatesInput = {
    AND?: ApplicantScalarWhereWithAggregatesInput | ApplicantScalarWhereWithAggregatesInput[]
    OR?: ApplicantScalarWhereWithAggregatesInput[]
    NOT?: ApplicantScalarWhereWithAggregatesInput | ApplicantScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Applicant"> | string
    positionApplied?: StringWithAggregatesFilter<"Applicant"> | string
    expectedSalary?: DecimalNullableWithAggregatesFilter<"Applicant"> | Decimal | DecimalJsLike | number | string | null
    startDate?: DateTimeNullableWithAggregatesFilter<"Applicant"> | Date | string | null
    employmentStatus?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    firstName?: StringWithAggregatesFilter<"Applicant"> | string
    lastName?: StringWithAggregatesFilter<"Applicant"> | string
    nickname?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    dateOfBirth?: DateTimeWithAggregatesFilter<"Applicant"> | Date | string
    age?: IntWithAggregatesFilter<"Applicant"> | number
    gender?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    nationality?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    religion?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    race?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    phone?: StringWithAggregatesFilter<"Applicant"> | string
    email?: StringWithAggregatesFilter<"Applicant"> | string
    address?: StringWithAggregatesFilter<"Applicant"> | string
    residenceType?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    livingDuration?: IntNullableWithAggregatesFilter<"Applicant"> | number | null
    maritalStatus?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    militaryStatus?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    childrenCount?: IntWithAggregatesFilter<"Applicant"> | number
    skills?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    documents?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    photoPath?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    resumePath?: StringNullableWithAggregatesFilter<"Applicant"> | string | null
    status?: StringWithAggregatesFilter<"Applicant"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Applicant"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Applicant"> | Date | string
  }

  export type ApplicantEducationWhereInput = {
    AND?: ApplicantEducationWhereInput | ApplicantEducationWhereInput[]
    OR?: ApplicantEducationWhereInput[]
    NOT?: ApplicantEducationWhereInput | ApplicantEducationWhereInput[]
    id?: StringFilter<"ApplicantEducation"> | string
    applicantId?: StringFilter<"ApplicantEducation"> | string
    level?: StringFilter<"ApplicantEducation"> | string
    institution?: StringFilter<"ApplicantEducation"> | string
    major?: StringNullableFilter<"ApplicantEducation"> | string | null
    graduatedYear?: IntNullableFilter<"ApplicantEducation"> | number | null
    gpa?: DecimalNullableFilter<"ApplicantEducation"> | Decimal | DecimalJsLike | number | string | null
    applicant?: XOR<ApplicantRelationFilter, ApplicantWhereInput>
  }

  export type ApplicantEducationOrderByWithRelationInput = {
    id?: SortOrder
    applicantId?: SortOrder
    level?: SortOrder
    institution?: SortOrder
    major?: SortOrderInput | SortOrder
    graduatedYear?: SortOrderInput | SortOrder
    gpa?: SortOrderInput | SortOrder
    applicant?: ApplicantOrderByWithRelationInput
  }

  export type ApplicantEducationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ApplicantEducationWhereInput | ApplicantEducationWhereInput[]
    OR?: ApplicantEducationWhereInput[]
    NOT?: ApplicantEducationWhereInput | ApplicantEducationWhereInput[]
    applicantId?: StringFilter<"ApplicantEducation"> | string
    level?: StringFilter<"ApplicantEducation"> | string
    institution?: StringFilter<"ApplicantEducation"> | string
    major?: StringNullableFilter<"ApplicantEducation"> | string | null
    graduatedYear?: IntNullableFilter<"ApplicantEducation"> | number | null
    gpa?: DecimalNullableFilter<"ApplicantEducation"> | Decimal | DecimalJsLike | number | string | null
    applicant?: XOR<ApplicantRelationFilter, ApplicantWhereInput>
  }, "id">

  export type ApplicantEducationOrderByWithAggregationInput = {
    id?: SortOrder
    applicantId?: SortOrder
    level?: SortOrder
    institution?: SortOrder
    major?: SortOrderInput | SortOrder
    graduatedYear?: SortOrderInput | SortOrder
    gpa?: SortOrderInput | SortOrder
    _count?: ApplicantEducationCountOrderByAggregateInput
    _avg?: ApplicantEducationAvgOrderByAggregateInput
    _max?: ApplicantEducationMaxOrderByAggregateInput
    _min?: ApplicantEducationMinOrderByAggregateInput
    _sum?: ApplicantEducationSumOrderByAggregateInput
  }

  export type ApplicantEducationScalarWhereWithAggregatesInput = {
    AND?: ApplicantEducationScalarWhereWithAggregatesInput | ApplicantEducationScalarWhereWithAggregatesInput[]
    OR?: ApplicantEducationScalarWhereWithAggregatesInput[]
    NOT?: ApplicantEducationScalarWhereWithAggregatesInput | ApplicantEducationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ApplicantEducation"> | string
    applicantId?: StringWithAggregatesFilter<"ApplicantEducation"> | string
    level?: StringWithAggregatesFilter<"ApplicantEducation"> | string
    institution?: StringWithAggregatesFilter<"ApplicantEducation"> | string
    major?: StringNullableWithAggregatesFilter<"ApplicantEducation"> | string | null
    graduatedYear?: IntNullableWithAggregatesFilter<"ApplicantEducation"> | number | null
    gpa?: DecimalNullableWithAggregatesFilter<"ApplicantEducation"> | Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantExperienceWhereInput = {
    AND?: ApplicantExperienceWhereInput | ApplicantExperienceWhereInput[]
    OR?: ApplicantExperienceWhereInput[]
    NOT?: ApplicantExperienceWhereInput | ApplicantExperienceWhereInput[]
    id?: StringFilter<"ApplicantExperience"> | string
    applicantId?: StringFilter<"ApplicantExperience"> | string
    company?: StringFilter<"ApplicantExperience"> | string
    position?: StringFilter<"ApplicantExperience"> | string
    salary?: DecimalNullableFilter<"ApplicantExperience"> | Decimal | DecimalJsLike | number | string | null
    startDate?: DateTimeNullableFilter<"ApplicantExperience"> | Date | string | null
    endDate?: DateTimeNullableFilter<"ApplicantExperience"> | Date | string | null
    reasonForLeaving?: StringNullableFilter<"ApplicantExperience"> | string | null
    applicant?: XOR<ApplicantRelationFilter, ApplicantWhereInput>
  }

  export type ApplicantExperienceOrderByWithRelationInput = {
    id?: SortOrder
    applicantId?: SortOrder
    company?: SortOrder
    position?: SortOrder
    salary?: SortOrderInput | SortOrder
    startDate?: SortOrderInput | SortOrder
    endDate?: SortOrderInput | SortOrder
    reasonForLeaving?: SortOrderInput | SortOrder
    applicant?: ApplicantOrderByWithRelationInput
  }

  export type ApplicantExperienceWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ApplicantExperienceWhereInput | ApplicantExperienceWhereInput[]
    OR?: ApplicantExperienceWhereInput[]
    NOT?: ApplicantExperienceWhereInput | ApplicantExperienceWhereInput[]
    applicantId?: StringFilter<"ApplicantExperience"> | string
    company?: StringFilter<"ApplicantExperience"> | string
    position?: StringFilter<"ApplicantExperience"> | string
    salary?: DecimalNullableFilter<"ApplicantExperience"> | Decimal | DecimalJsLike | number | string | null
    startDate?: DateTimeNullableFilter<"ApplicantExperience"> | Date | string | null
    endDate?: DateTimeNullableFilter<"ApplicantExperience"> | Date | string | null
    reasonForLeaving?: StringNullableFilter<"ApplicantExperience"> | string | null
    applicant?: XOR<ApplicantRelationFilter, ApplicantWhereInput>
  }, "id">

  export type ApplicantExperienceOrderByWithAggregationInput = {
    id?: SortOrder
    applicantId?: SortOrder
    company?: SortOrder
    position?: SortOrder
    salary?: SortOrderInput | SortOrder
    startDate?: SortOrderInput | SortOrder
    endDate?: SortOrderInput | SortOrder
    reasonForLeaving?: SortOrderInput | SortOrder
    _count?: ApplicantExperienceCountOrderByAggregateInput
    _avg?: ApplicantExperienceAvgOrderByAggregateInput
    _max?: ApplicantExperienceMaxOrderByAggregateInput
    _min?: ApplicantExperienceMinOrderByAggregateInput
    _sum?: ApplicantExperienceSumOrderByAggregateInput
  }

  export type ApplicantExperienceScalarWhereWithAggregatesInput = {
    AND?: ApplicantExperienceScalarWhereWithAggregatesInput | ApplicantExperienceScalarWhereWithAggregatesInput[]
    OR?: ApplicantExperienceScalarWhereWithAggregatesInput[]
    NOT?: ApplicantExperienceScalarWhereWithAggregatesInput | ApplicantExperienceScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ApplicantExperience"> | string
    applicantId?: StringWithAggregatesFilter<"ApplicantExperience"> | string
    company?: StringWithAggregatesFilter<"ApplicantExperience"> | string
    position?: StringWithAggregatesFilter<"ApplicantExperience"> | string
    salary?: DecimalNullableWithAggregatesFilter<"ApplicantExperience"> | Decimal | DecimalJsLike | number | string | null
    startDate?: DateTimeNullableWithAggregatesFilter<"ApplicantExperience"> | Date | string | null
    endDate?: DateTimeNullableWithAggregatesFilter<"ApplicantExperience"> | Date | string | null
    reasonForLeaving?: StringNullableWithAggregatesFilter<"ApplicantExperience"> | string | null
  }

  export type UserCreateInput = {
    id?: string
    username: string
    password: string
    role?: string
    name?: string | null
    biometric_id?: string | null
    fingerprint_data?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUncheckedCreateInput = {
    id?: string
    username: string
    password: string
    role?: string
    name?: string | null
    biometric_id?: string | null
    fingerprint_data?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biometric_id?: NullableStringFieldUpdateOperationsInput | string | null
    fingerprint_data?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biometric_id?: NullableStringFieldUpdateOperationsInput | string | null
    fingerprint_data?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateManyInput = {
    id?: string
    username: string
    password: string
    role?: string
    name?: string | null
    biometric_id?: string | null
    fingerprint_data?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biometric_id?: NullableStringFieldUpdateOperationsInput | string | null
    fingerprint_data?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biometric_id?: NullableStringFieldUpdateOperationsInput | string | null
    fingerprint_data?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type JobApplicationCreateInput = {
    fullname_th?: string | null
    position_applied?: string | null
    salary_expected?: string | null
    phone?: string | null
    email?: string | null
    photo_file?: string | null
    resume_file?: string | null
    created_at?: Date | string
  }

  export type JobApplicationUncheckedCreateInput = {
    id?: number
    fullname_th?: string | null
    position_applied?: string | null
    salary_expected?: string | null
    phone?: string | null
    email?: string | null
    photo_file?: string | null
    resume_file?: string | null
    created_at?: Date | string
  }

  export type JobApplicationUpdateInput = {
    fullname_th?: NullableStringFieldUpdateOperationsInput | string | null
    position_applied?: NullableStringFieldUpdateOperationsInput | string | null
    salary_expected?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    photo_file?: NullableStringFieldUpdateOperationsInput | string | null
    resume_file?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type JobApplicationUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    fullname_th?: NullableStringFieldUpdateOperationsInput | string | null
    position_applied?: NullableStringFieldUpdateOperationsInput | string | null
    salary_expected?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    photo_file?: NullableStringFieldUpdateOperationsInput | string | null
    resume_file?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type JobApplicationCreateManyInput = {
    id?: number
    fullname_th?: string | null
    position_applied?: string | null
    salary_expected?: string | null
    phone?: string | null
    email?: string | null
    photo_file?: string | null
    resume_file?: string | null
    created_at?: Date | string
  }

  export type JobApplicationUpdateManyMutationInput = {
    fullname_th?: NullableStringFieldUpdateOperationsInput | string | null
    position_applied?: NullableStringFieldUpdateOperationsInput | string | null
    salary_expected?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    photo_file?: NullableStringFieldUpdateOperationsInput | string | null
    resume_file?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type JobApplicationUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    fullname_th?: NullableStringFieldUpdateOperationsInput | string | null
    position_applied?: NullableStringFieldUpdateOperationsInput | string | null
    salary_expected?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    photo_file?: NullableStringFieldUpdateOperationsInput | string | null
    resume_file?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApplicantCreateInput = {
    id?: string
    positionApplied: string
    expectedSalary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    employmentStatus?: string | null
    firstName: string
    lastName: string
    nickname?: string | null
    dateOfBirth: Date | string
    age: number
    gender?: string | null
    nationality?: string | null
    religion?: string | null
    race?: string | null
    phone: string
    email: string
    address: string
    residenceType?: string | null
    livingDuration?: number | null
    maritalStatus?: string | null
    militaryStatus?: string | null
    childrenCount?: number
    skills?: string | null
    documents?: string | null
    photoPath?: string | null
    resumePath?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    educations?: ApplicantEducationCreateNestedManyWithoutApplicantInput
    experiences?: ApplicantExperienceCreateNestedManyWithoutApplicantInput
  }

  export type ApplicantUncheckedCreateInput = {
    id?: string
    positionApplied: string
    expectedSalary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    employmentStatus?: string | null
    firstName: string
    lastName: string
    nickname?: string | null
    dateOfBirth: Date | string
    age: number
    gender?: string | null
    nationality?: string | null
    religion?: string | null
    race?: string | null
    phone: string
    email: string
    address: string
    residenceType?: string | null
    livingDuration?: number | null
    maritalStatus?: string | null
    militaryStatus?: string | null
    childrenCount?: number
    skills?: string | null
    documents?: string | null
    photoPath?: string | null
    resumePath?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    educations?: ApplicantEducationUncheckedCreateNestedManyWithoutApplicantInput
    experiences?: ApplicantExperienceUncheckedCreateNestedManyWithoutApplicantInput
  }

  export type ApplicantUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    positionApplied?: StringFieldUpdateOperationsInput | string
    expectedSalary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employmentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    dateOfBirth?: DateTimeFieldUpdateOperationsInput | Date | string
    age?: IntFieldUpdateOperationsInput | number
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    nationality?: NullableStringFieldUpdateOperationsInput | string | null
    religion?: NullableStringFieldUpdateOperationsInput | string | null
    race?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    residenceType?: NullableStringFieldUpdateOperationsInput | string | null
    livingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    maritalStatus?: NullableStringFieldUpdateOperationsInput | string | null
    militaryStatus?: NullableStringFieldUpdateOperationsInput | string | null
    childrenCount?: IntFieldUpdateOperationsInput | number
    skills?: NullableStringFieldUpdateOperationsInput | string | null
    documents?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    resumePath?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    educations?: ApplicantEducationUpdateManyWithoutApplicantNestedInput
    experiences?: ApplicantExperienceUpdateManyWithoutApplicantNestedInput
  }

  export type ApplicantUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    positionApplied?: StringFieldUpdateOperationsInput | string
    expectedSalary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employmentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    dateOfBirth?: DateTimeFieldUpdateOperationsInput | Date | string
    age?: IntFieldUpdateOperationsInput | number
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    nationality?: NullableStringFieldUpdateOperationsInput | string | null
    religion?: NullableStringFieldUpdateOperationsInput | string | null
    race?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    residenceType?: NullableStringFieldUpdateOperationsInput | string | null
    livingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    maritalStatus?: NullableStringFieldUpdateOperationsInput | string | null
    militaryStatus?: NullableStringFieldUpdateOperationsInput | string | null
    childrenCount?: IntFieldUpdateOperationsInput | number
    skills?: NullableStringFieldUpdateOperationsInput | string | null
    documents?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    resumePath?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    educations?: ApplicantEducationUncheckedUpdateManyWithoutApplicantNestedInput
    experiences?: ApplicantExperienceUncheckedUpdateManyWithoutApplicantNestedInput
  }

  export type ApplicantCreateManyInput = {
    id?: string
    positionApplied: string
    expectedSalary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    employmentStatus?: string | null
    firstName: string
    lastName: string
    nickname?: string | null
    dateOfBirth: Date | string
    age: number
    gender?: string | null
    nationality?: string | null
    religion?: string | null
    race?: string | null
    phone: string
    email: string
    address: string
    residenceType?: string | null
    livingDuration?: number | null
    maritalStatus?: string | null
    militaryStatus?: string | null
    childrenCount?: number
    skills?: string | null
    documents?: string | null
    photoPath?: string | null
    resumePath?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ApplicantUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    positionApplied?: StringFieldUpdateOperationsInput | string
    expectedSalary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employmentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    dateOfBirth?: DateTimeFieldUpdateOperationsInput | Date | string
    age?: IntFieldUpdateOperationsInput | number
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    nationality?: NullableStringFieldUpdateOperationsInput | string | null
    religion?: NullableStringFieldUpdateOperationsInput | string | null
    race?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    residenceType?: NullableStringFieldUpdateOperationsInput | string | null
    livingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    maritalStatus?: NullableStringFieldUpdateOperationsInput | string | null
    militaryStatus?: NullableStringFieldUpdateOperationsInput | string | null
    childrenCount?: IntFieldUpdateOperationsInput | number
    skills?: NullableStringFieldUpdateOperationsInput | string | null
    documents?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    resumePath?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApplicantUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    positionApplied?: StringFieldUpdateOperationsInput | string
    expectedSalary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employmentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    dateOfBirth?: DateTimeFieldUpdateOperationsInput | Date | string
    age?: IntFieldUpdateOperationsInput | number
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    nationality?: NullableStringFieldUpdateOperationsInput | string | null
    religion?: NullableStringFieldUpdateOperationsInput | string | null
    race?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    residenceType?: NullableStringFieldUpdateOperationsInput | string | null
    livingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    maritalStatus?: NullableStringFieldUpdateOperationsInput | string | null
    militaryStatus?: NullableStringFieldUpdateOperationsInput | string | null
    childrenCount?: IntFieldUpdateOperationsInput | number
    skills?: NullableStringFieldUpdateOperationsInput | string | null
    documents?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    resumePath?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApplicantEducationCreateInput = {
    id?: string
    level: string
    institution: string
    major?: string | null
    graduatedYear?: number | null
    gpa?: Decimal | DecimalJsLike | number | string | null
    applicant: ApplicantCreateNestedOneWithoutEducationsInput
  }

  export type ApplicantEducationUncheckedCreateInput = {
    id?: string
    applicantId: string
    level: string
    institution: string
    major?: string | null
    graduatedYear?: number | null
    gpa?: Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantEducationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    institution?: StringFieldUpdateOperationsInput | string
    major?: NullableStringFieldUpdateOperationsInput | string | null
    graduatedYear?: NullableIntFieldUpdateOperationsInput | number | null
    gpa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    applicant?: ApplicantUpdateOneRequiredWithoutEducationsNestedInput
  }

  export type ApplicantEducationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    applicantId?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    institution?: StringFieldUpdateOperationsInput | string
    major?: NullableStringFieldUpdateOperationsInput | string | null
    graduatedYear?: NullableIntFieldUpdateOperationsInput | number | null
    gpa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantEducationCreateManyInput = {
    id?: string
    applicantId: string
    level: string
    institution: string
    major?: string | null
    graduatedYear?: number | null
    gpa?: Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantEducationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    institution?: StringFieldUpdateOperationsInput | string
    major?: NullableStringFieldUpdateOperationsInput | string | null
    graduatedYear?: NullableIntFieldUpdateOperationsInput | number | null
    gpa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantEducationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    applicantId?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    institution?: StringFieldUpdateOperationsInput | string
    major?: NullableStringFieldUpdateOperationsInput | string | null
    graduatedYear?: NullableIntFieldUpdateOperationsInput | number | null
    gpa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantExperienceCreateInput = {
    id?: string
    company: string
    position: string
    salary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    reasonForLeaving?: string | null
    applicant: ApplicantCreateNestedOneWithoutExperiencesInput
  }

  export type ApplicantExperienceUncheckedCreateInput = {
    id?: string
    applicantId: string
    company: string
    position: string
    salary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    reasonForLeaving?: string | null
  }

  export type ApplicantExperienceUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    reasonForLeaving?: NullableStringFieldUpdateOperationsInput | string | null
    applicant?: ApplicantUpdateOneRequiredWithoutExperiencesNestedInput
  }

  export type ApplicantExperienceUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    applicantId?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    reasonForLeaving?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ApplicantExperienceCreateManyInput = {
    id?: string
    applicantId: string
    company: string
    position: string
    salary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    reasonForLeaving?: string | null
  }

  export type ApplicantExperienceUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    reasonForLeaving?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ApplicantExperienceUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    applicantId?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    reasonForLeaving?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrder
    name?: SortOrder
    biometric_id?: SortOrder
    fingerprint_data?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrder
    name?: SortOrder
    biometric_id?: SortOrder
    fingerprint_data?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrder
    name?: SortOrder
    biometric_id?: SortOrder
    fingerprint_data?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type JobApplicationCountOrderByAggregateInput = {
    id?: SortOrder
    fullname_th?: SortOrder
    position_applied?: SortOrder
    salary_expected?: SortOrder
    phone?: SortOrder
    email?: SortOrder
    photo_file?: SortOrder
    resume_file?: SortOrder
    created_at?: SortOrder
  }

  export type JobApplicationAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type JobApplicationMaxOrderByAggregateInput = {
    id?: SortOrder
    fullname_th?: SortOrder
    position_applied?: SortOrder
    salary_expected?: SortOrder
    phone?: SortOrder
    email?: SortOrder
    photo_file?: SortOrder
    resume_file?: SortOrder
    created_at?: SortOrder
  }

  export type JobApplicationMinOrderByAggregateInput = {
    id?: SortOrder
    fullname_th?: SortOrder
    position_applied?: SortOrder
    salary_expected?: SortOrder
    phone?: SortOrder
    email?: SortOrder
    photo_file?: SortOrder
    resume_file?: SortOrder
    created_at?: SortOrder
  }

  export type JobApplicationSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type ApplicantEducationListRelationFilter = {
    every?: ApplicantEducationWhereInput
    some?: ApplicantEducationWhereInput
    none?: ApplicantEducationWhereInput
  }

  export type ApplicantExperienceListRelationFilter = {
    every?: ApplicantExperienceWhereInput
    some?: ApplicantExperienceWhereInput
    none?: ApplicantExperienceWhereInput
  }

  export type ApplicantEducationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ApplicantExperienceOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ApplicantCountOrderByAggregateInput = {
    id?: SortOrder
    positionApplied?: SortOrder
    expectedSalary?: SortOrder
    startDate?: SortOrder
    employmentStatus?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    nickname?: SortOrder
    dateOfBirth?: SortOrder
    age?: SortOrder
    gender?: SortOrder
    nationality?: SortOrder
    religion?: SortOrder
    race?: SortOrder
    phone?: SortOrder
    email?: SortOrder
    address?: SortOrder
    residenceType?: SortOrder
    livingDuration?: SortOrder
    maritalStatus?: SortOrder
    militaryStatus?: SortOrder
    childrenCount?: SortOrder
    skills?: SortOrder
    documents?: SortOrder
    photoPath?: SortOrder
    resumePath?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ApplicantAvgOrderByAggregateInput = {
    expectedSalary?: SortOrder
    age?: SortOrder
    livingDuration?: SortOrder
    childrenCount?: SortOrder
  }

  export type ApplicantMaxOrderByAggregateInput = {
    id?: SortOrder
    positionApplied?: SortOrder
    expectedSalary?: SortOrder
    startDate?: SortOrder
    employmentStatus?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    nickname?: SortOrder
    dateOfBirth?: SortOrder
    age?: SortOrder
    gender?: SortOrder
    nationality?: SortOrder
    religion?: SortOrder
    race?: SortOrder
    phone?: SortOrder
    email?: SortOrder
    address?: SortOrder
    residenceType?: SortOrder
    livingDuration?: SortOrder
    maritalStatus?: SortOrder
    militaryStatus?: SortOrder
    childrenCount?: SortOrder
    skills?: SortOrder
    documents?: SortOrder
    photoPath?: SortOrder
    resumePath?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ApplicantMinOrderByAggregateInput = {
    id?: SortOrder
    positionApplied?: SortOrder
    expectedSalary?: SortOrder
    startDate?: SortOrder
    employmentStatus?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    nickname?: SortOrder
    dateOfBirth?: SortOrder
    age?: SortOrder
    gender?: SortOrder
    nationality?: SortOrder
    religion?: SortOrder
    race?: SortOrder
    phone?: SortOrder
    email?: SortOrder
    address?: SortOrder
    residenceType?: SortOrder
    livingDuration?: SortOrder
    maritalStatus?: SortOrder
    militaryStatus?: SortOrder
    childrenCount?: SortOrder
    skills?: SortOrder
    documents?: SortOrder
    photoPath?: SortOrder
    resumePath?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ApplicantSumOrderByAggregateInput = {
    expectedSalary?: SortOrder
    age?: SortOrder
    livingDuration?: SortOrder
    childrenCount?: SortOrder
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type ApplicantRelationFilter = {
    is?: ApplicantWhereInput
    isNot?: ApplicantWhereInput
  }

  export type ApplicantEducationCountOrderByAggregateInput = {
    id?: SortOrder
    applicantId?: SortOrder
    level?: SortOrder
    institution?: SortOrder
    major?: SortOrder
    graduatedYear?: SortOrder
    gpa?: SortOrder
  }

  export type ApplicantEducationAvgOrderByAggregateInput = {
    graduatedYear?: SortOrder
    gpa?: SortOrder
  }

  export type ApplicantEducationMaxOrderByAggregateInput = {
    id?: SortOrder
    applicantId?: SortOrder
    level?: SortOrder
    institution?: SortOrder
    major?: SortOrder
    graduatedYear?: SortOrder
    gpa?: SortOrder
  }

  export type ApplicantEducationMinOrderByAggregateInput = {
    id?: SortOrder
    applicantId?: SortOrder
    level?: SortOrder
    institution?: SortOrder
    major?: SortOrder
    graduatedYear?: SortOrder
    gpa?: SortOrder
  }

  export type ApplicantEducationSumOrderByAggregateInput = {
    graduatedYear?: SortOrder
    gpa?: SortOrder
  }

  export type ApplicantExperienceCountOrderByAggregateInput = {
    id?: SortOrder
    applicantId?: SortOrder
    company?: SortOrder
    position?: SortOrder
    salary?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    reasonForLeaving?: SortOrder
  }

  export type ApplicantExperienceAvgOrderByAggregateInput = {
    salary?: SortOrder
  }

  export type ApplicantExperienceMaxOrderByAggregateInput = {
    id?: SortOrder
    applicantId?: SortOrder
    company?: SortOrder
    position?: SortOrder
    salary?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    reasonForLeaving?: SortOrder
  }

  export type ApplicantExperienceMinOrderByAggregateInput = {
    id?: SortOrder
    applicantId?: SortOrder
    company?: SortOrder
    position?: SortOrder
    salary?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    reasonForLeaving?: SortOrder
  }

  export type ApplicantExperienceSumOrderByAggregateInput = {
    salary?: SortOrder
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ApplicantEducationCreateNestedManyWithoutApplicantInput = {
    create?: XOR<ApplicantEducationCreateWithoutApplicantInput, ApplicantEducationUncheckedCreateWithoutApplicantInput> | ApplicantEducationCreateWithoutApplicantInput[] | ApplicantEducationUncheckedCreateWithoutApplicantInput[]
    connectOrCreate?: ApplicantEducationCreateOrConnectWithoutApplicantInput | ApplicantEducationCreateOrConnectWithoutApplicantInput[]
    createMany?: ApplicantEducationCreateManyApplicantInputEnvelope
    connect?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
  }

  export type ApplicantExperienceCreateNestedManyWithoutApplicantInput = {
    create?: XOR<ApplicantExperienceCreateWithoutApplicantInput, ApplicantExperienceUncheckedCreateWithoutApplicantInput> | ApplicantExperienceCreateWithoutApplicantInput[] | ApplicantExperienceUncheckedCreateWithoutApplicantInput[]
    connectOrCreate?: ApplicantExperienceCreateOrConnectWithoutApplicantInput | ApplicantExperienceCreateOrConnectWithoutApplicantInput[]
    createMany?: ApplicantExperienceCreateManyApplicantInputEnvelope
    connect?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
  }

  export type ApplicantEducationUncheckedCreateNestedManyWithoutApplicantInput = {
    create?: XOR<ApplicantEducationCreateWithoutApplicantInput, ApplicantEducationUncheckedCreateWithoutApplicantInput> | ApplicantEducationCreateWithoutApplicantInput[] | ApplicantEducationUncheckedCreateWithoutApplicantInput[]
    connectOrCreate?: ApplicantEducationCreateOrConnectWithoutApplicantInput | ApplicantEducationCreateOrConnectWithoutApplicantInput[]
    createMany?: ApplicantEducationCreateManyApplicantInputEnvelope
    connect?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
  }

  export type ApplicantExperienceUncheckedCreateNestedManyWithoutApplicantInput = {
    create?: XOR<ApplicantExperienceCreateWithoutApplicantInput, ApplicantExperienceUncheckedCreateWithoutApplicantInput> | ApplicantExperienceCreateWithoutApplicantInput[] | ApplicantExperienceUncheckedCreateWithoutApplicantInput[]
    connectOrCreate?: ApplicantExperienceCreateOrConnectWithoutApplicantInput | ApplicantExperienceCreateOrConnectWithoutApplicantInput[]
    createMany?: ApplicantExperienceCreateManyApplicantInputEnvelope
    connect?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ApplicantEducationUpdateManyWithoutApplicantNestedInput = {
    create?: XOR<ApplicantEducationCreateWithoutApplicantInput, ApplicantEducationUncheckedCreateWithoutApplicantInput> | ApplicantEducationCreateWithoutApplicantInput[] | ApplicantEducationUncheckedCreateWithoutApplicantInput[]
    connectOrCreate?: ApplicantEducationCreateOrConnectWithoutApplicantInput | ApplicantEducationCreateOrConnectWithoutApplicantInput[]
    upsert?: ApplicantEducationUpsertWithWhereUniqueWithoutApplicantInput | ApplicantEducationUpsertWithWhereUniqueWithoutApplicantInput[]
    createMany?: ApplicantEducationCreateManyApplicantInputEnvelope
    set?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
    disconnect?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
    delete?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
    connect?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
    update?: ApplicantEducationUpdateWithWhereUniqueWithoutApplicantInput | ApplicantEducationUpdateWithWhereUniqueWithoutApplicantInput[]
    updateMany?: ApplicantEducationUpdateManyWithWhereWithoutApplicantInput | ApplicantEducationUpdateManyWithWhereWithoutApplicantInput[]
    deleteMany?: ApplicantEducationScalarWhereInput | ApplicantEducationScalarWhereInput[]
  }

  export type ApplicantExperienceUpdateManyWithoutApplicantNestedInput = {
    create?: XOR<ApplicantExperienceCreateWithoutApplicantInput, ApplicantExperienceUncheckedCreateWithoutApplicantInput> | ApplicantExperienceCreateWithoutApplicantInput[] | ApplicantExperienceUncheckedCreateWithoutApplicantInput[]
    connectOrCreate?: ApplicantExperienceCreateOrConnectWithoutApplicantInput | ApplicantExperienceCreateOrConnectWithoutApplicantInput[]
    upsert?: ApplicantExperienceUpsertWithWhereUniqueWithoutApplicantInput | ApplicantExperienceUpsertWithWhereUniqueWithoutApplicantInput[]
    createMany?: ApplicantExperienceCreateManyApplicantInputEnvelope
    set?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
    disconnect?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
    delete?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
    connect?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
    update?: ApplicantExperienceUpdateWithWhereUniqueWithoutApplicantInput | ApplicantExperienceUpdateWithWhereUniqueWithoutApplicantInput[]
    updateMany?: ApplicantExperienceUpdateManyWithWhereWithoutApplicantInput | ApplicantExperienceUpdateManyWithWhereWithoutApplicantInput[]
    deleteMany?: ApplicantExperienceScalarWhereInput | ApplicantExperienceScalarWhereInput[]
  }

  export type ApplicantEducationUncheckedUpdateManyWithoutApplicantNestedInput = {
    create?: XOR<ApplicantEducationCreateWithoutApplicantInput, ApplicantEducationUncheckedCreateWithoutApplicantInput> | ApplicantEducationCreateWithoutApplicantInput[] | ApplicantEducationUncheckedCreateWithoutApplicantInput[]
    connectOrCreate?: ApplicantEducationCreateOrConnectWithoutApplicantInput | ApplicantEducationCreateOrConnectWithoutApplicantInput[]
    upsert?: ApplicantEducationUpsertWithWhereUniqueWithoutApplicantInput | ApplicantEducationUpsertWithWhereUniqueWithoutApplicantInput[]
    createMany?: ApplicantEducationCreateManyApplicantInputEnvelope
    set?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
    disconnect?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
    delete?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
    connect?: ApplicantEducationWhereUniqueInput | ApplicantEducationWhereUniqueInput[]
    update?: ApplicantEducationUpdateWithWhereUniqueWithoutApplicantInput | ApplicantEducationUpdateWithWhereUniqueWithoutApplicantInput[]
    updateMany?: ApplicantEducationUpdateManyWithWhereWithoutApplicantInput | ApplicantEducationUpdateManyWithWhereWithoutApplicantInput[]
    deleteMany?: ApplicantEducationScalarWhereInput | ApplicantEducationScalarWhereInput[]
  }

  export type ApplicantExperienceUncheckedUpdateManyWithoutApplicantNestedInput = {
    create?: XOR<ApplicantExperienceCreateWithoutApplicantInput, ApplicantExperienceUncheckedCreateWithoutApplicantInput> | ApplicantExperienceCreateWithoutApplicantInput[] | ApplicantExperienceUncheckedCreateWithoutApplicantInput[]
    connectOrCreate?: ApplicantExperienceCreateOrConnectWithoutApplicantInput | ApplicantExperienceCreateOrConnectWithoutApplicantInput[]
    upsert?: ApplicantExperienceUpsertWithWhereUniqueWithoutApplicantInput | ApplicantExperienceUpsertWithWhereUniqueWithoutApplicantInput[]
    createMany?: ApplicantExperienceCreateManyApplicantInputEnvelope
    set?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
    disconnect?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
    delete?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
    connect?: ApplicantExperienceWhereUniqueInput | ApplicantExperienceWhereUniqueInput[]
    update?: ApplicantExperienceUpdateWithWhereUniqueWithoutApplicantInput | ApplicantExperienceUpdateWithWhereUniqueWithoutApplicantInput[]
    updateMany?: ApplicantExperienceUpdateManyWithWhereWithoutApplicantInput | ApplicantExperienceUpdateManyWithWhereWithoutApplicantInput[]
    deleteMany?: ApplicantExperienceScalarWhereInput | ApplicantExperienceScalarWhereInput[]
  }

  export type ApplicantCreateNestedOneWithoutEducationsInput = {
    create?: XOR<ApplicantCreateWithoutEducationsInput, ApplicantUncheckedCreateWithoutEducationsInput>
    connectOrCreate?: ApplicantCreateOrConnectWithoutEducationsInput
    connect?: ApplicantWhereUniqueInput
  }

  export type ApplicantUpdateOneRequiredWithoutEducationsNestedInput = {
    create?: XOR<ApplicantCreateWithoutEducationsInput, ApplicantUncheckedCreateWithoutEducationsInput>
    connectOrCreate?: ApplicantCreateOrConnectWithoutEducationsInput
    upsert?: ApplicantUpsertWithoutEducationsInput
    connect?: ApplicantWhereUniqueInput
    update?: XOR<XOR<ApplicantUpdateToOneWithWhereWithoutEducationsInput, ApplicantUpdateWithoutEducationsInput>, ApplicantUncheckedUpdateWithoutEducationsInput>
  }

  export type ApplicantCreateNestedOneWithoutExperiencesInput = {
    create?: XOR<ApplicantCreateWithoutExperiencesInput, ApplicantUncheckedCreateWithoutExperiencesInput>
    connectOrCreate?: ApplicantCreateOrConnectWithoutExperiencesInput
    connect?: ApplicantWhereUniqueInput
  }

  export type ApplicantUpdateOneRequiredWithoutExperiencesNestedInput = {
    create?: XOR<ApplicantCreateWithoutExperiencesInput, ApplicantUncheckedCreateWithoutExperiencesInput>
    connectOrCreate?: ApplicantCreateOrConnectWithoutExperiencesInput
    upsert?: ApplicantUpsertWithoutExperiencesInput
    connect?: ApplicantWhereUniqueInput
    update?: XOR<XOR<ApplicantUpdateToOneWithWhereWithoutExperiencesInput, ApplicantUpdateWithoutExperiencesInput>, ApplicantUncheckedUpdateWithoutExperiencesInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type ApplicantEducationCreateWithoutApplicantInput = {
    id?: string
    level: string
    institution: string
    major?: string | null
    graduatedYear?: number | null
    gpa?: Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantEducationUncheckedCreateWithoutApplicantInput = {
    id?: string
    level: string
    institution: string
    major?: string | null
    graduatedYear?: number | null
    gpa?: Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantEducationCreateOrConnectWithoutApplicantInput = {
    where: ApplicantEducationWhereUniqueInput
    create: XOR<ApplicantEducationCreateWithoutApplicantInput, ApplicantEducationUncheckedCreateWithoutApplicantInput>
  }

  export type ApplicantEducationCreateManyApplicantInputEnvelope = {
    data: ApplicantEducationCreateManyApplicantInput | ApplicantEducationCreateManyApplicantInput[]
  }

  export type ApplicantExperienceCreateWithoutApplicantInput = {
    id?: string
    company: string
    position: string
    salary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    reasonForLeaving?: string | null
  }

  export type ApplicantExperienceUncheckedCreateWithoutApplicantInput = {
    id?: string
    company: string
    position: string
    salary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    reasonForLeaving?: string | null
  }

  export type ApplicantExperienceCreateOrConnectWithoutApplicantInput = {
    where: ApplicantExperienceWhereUniqueInput
    create: XOR<ApplicantExperienceCreateWithoutApplicantInput, ApplicantExperienceUncheckedCreateWithoutApplicantInput>
  }

  export type ApplicantExperienceCreateManyApplicantInputEnvelope = {
    data: ApplicantExperienceCreateManyApplicantInput | ApplicantExperienceCreateManyApplicantInput[]
  }

  export type ApplicantEducationUpsertWithWhereUniqueWithoutApplicantInput = {
    where: ApplicantEducationWhereUniqueInput
    update: XOR<ApplicantEducationUpdateWithoutApplicantInput, ApplicantEducationUncheckedUpdateWithoutApplicantInput>
    create: XOR<ApplicantEducationCreateWithoutApplicantInput, ApplicantEducationUncheckedCreateWithoutApplicantInput>
  }

  export type ApplicantEducationUpdateWithWhereUniqueWithoutApplicantInput = {
    where: ApplicantEducationWhereUniqueInput
    data: XOR<ApplicantEducationUpdateWithoutApplicantInput, ApplicantEducationUncheckedUpdateWithoutApplicantInput>
  }

  export type ApplicantEducationUpdateManyWithWhereWithoutApplicantInput = {
    where: ApplicantEducationScalarWhereInput
    data: XOR<ApplicantEducationUpdateManyMutationInput, ApplicantEducationUncheckedUpdateManyWithoutApplicantInput>
  }

  export type ApplicantEducationScalarWhereInput = {
    AND?: ApplicantEducationScalarWhereInput | ApplicantEducationScalarWhereInput[]
    OR?: ApplicantEducationScalarWhereInput[]
    NOT?: ApplicantEducationScalarWhereInput | ApplicantEducationScalarWhereInput[]
    id?: StringFilter<"ApplicantEducation"> | string
    applicantId?: StringFilter<"ApplicantEducation"> | string
    level?: StringFilter<"ApplicantEducation"> | string
    institution?: StringFilter<"ApplicantEducation"> | string
    major?: StringNullableFilter<"ApplicantEducation"> | string | null
    graduatedYear?: IntNullableFilter<"ApplicantEducation"> | number | null
    gpa?: DecimalNullableFilter<"ApplicantEducation"> | Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantExperienceUpsertWithWhereUniqueWithoutApplicantInput = {
    where: ApplicantExperienceWhereUniqueInput
    update: XOR<ApplicantExperienceUpdateWithoutApplicantInput, ApplicantExperienceUncheckedUpdateWithoutApplicantInput>
    create: XOR<ApplicantExperienceCreateWithoutApplicantInput, ApplicantExperienceUncheckedCreateWithoutApplicantInput>
  }

  export type ApplicantExperienceUpdateWithWhereUniqueWithoutApplicantInput = {
    where: ApplicantExperienceWhereUniqueInput
    data: XOR<ApplicantExperienceUpdateWithoutApplicantInput, ApplicantExperienceUncheckedUpdateWithoutApplicantInput>
  }

  export type ApplicantExperienceUpdateManyWithWhereWithoutApplicantInput = {
    where: ApplicantExperienceScalarWhereInput
    data: XOR<ApplicantExperienceUpdateManyMutationInput, ApplicantExperienceUncheckedUpdateManyWithoutApplicantInput>
  }

  export type ApplicantExperienceScalarWhereInput = {
    AND?: ApplicantExperienceScalarWhereInput | ApplicantExperienceScalarWhereInput[]
    OR?: ApplicantExperienceScalarWhereInput[]
    NOT?: ApplicantExperienceScalarWhereInput | ApplicantExperienceScalarWhereInput[]
    id?: StringFilter<"ApplicantExperience"> | string
    applicantId?: StringFilter<"ApplicantExperience"> | string
    company?: StringFilter<"ApplicantExperience"> | string
    position?: StringFilter<"ApplicantExperience"> | string
    salary?: DecimalNullableFilter<"ApplicantExperience"> | Decimal | DecimalJsLike | number | string | null
    startDate?: DateTimeNullableFilter<"ApplicantExperience"> | Date | string | null
    endDate?: DateTimeNullableFilter<"ApplicantExperience"> | Date | string | null
    reasonForLeaving?: StringNullableFilter<"ApplicantExperience"> | string | null
  }

  export type ApplicantCreateWithoutEducationsInput = {
    id?: string
    positionApplied: string
    expectedSalary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    employmentStatus?: string | null
    firstName: string
    lastName: string
    nickname?: string | null
    dateOfBirth: Date | string
    age: number
    gender?: string | null
    nationality?: string | null
    religion?: string | null
    race?: string | null
    phone: string
    email: string
    address: string
    residenceType?: string | null
    livingDuration?: number | null
    maritalStatus?: string | null
    militaryStatus?: string | null
    childrenCount?: number
    skills?: string | null
    documents?: string | null
    photoPath?: string | null
    resumePath?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    experiences?: ApplicantExperienceCreateNestedManyWithoutApplicantInput
  }

  export type ApplicantUncheckedCreateWithoutEducationsInput = {
    id?: string
    positionApplied: string
    expectedSalary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    employmentStatus?: string | null
    firstName: string
    lastName: string
    nickname?: string | null
    dateOfBirth: Date | string
    age: number
    gender?: string | null
    nationality?: string | null
    religion?: string | null
    race?: string | null
    phone: string
    email: string
    address: string
    residenceType?: string | null
    livingDuration?: number | null
    maritalStatus?: string | null
    militaryStatus?: string | null
    childrenCount?: number
    skills?: string | null
    documents?: string | null
    photoPath?: string | null
    resumePath?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    experiences?: ApplicantExperienceUncheckedCreateNestedManyWithoutApplicantInput
  }

  export type ApplicantCreateOrConnectWithoutEducationsInput = {
    where: ApplicantWhereUniqueInput
    create: XOR<ApplicantCreateWithoutEducationsInput, ApplicantUncheckedCreateWithoutEducationsInput>
  }

  export type ApplicantUpsertWithoutEducationsInput = {
    update: XOR<ApplicantUpdateWithoutEducationsInput, ApplicantUncheckedUpdateWithoutEducationsInput>
    create: XOR<ApplicantCreateWithoutEducationsInput, ApplicantUncheckedCreateWithoutEducationsInput>
    where?: ApplicantWhereInput
  }

  export type ApplicantUpdateToOneWithWhereWithoutEducationsInput = {
    where?: ApplicantWhereInput
    data: XOR<ApplicantUpdateWithoutEducationsInput, ApplicantUncheckedUpdateWithoutEducationsInput>
  }

  export type ApplicantUpdateWithoutEducationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    positionApplied?: StringFieldUpdateOperationsInput | string
    expectedSalary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employmentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    dateOfBirth?: DateTimeFieldUpdateOperationsInput | Date | string
    age?: IntFieldUpdateOperationsInput | number
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    nationality?: NullableStringFieldUpdateOperationsInput | string | null
    religion?: NullableStringFieldUpdateOperationsInput | string | null
    race?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    residenceType?: NullableStringFieldUpdateOperationsInput | string | null
    livingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    maritalStatus?: NullableStringFieldUpdateOperationsInput | string | null
    militaryStatus?: NullableStringFieldUpdateOperationsInput | string | null
    childrenCount?: IntFieldUpdateOperationsInput | number
    skills?: NullableStringFieldUpdateOperationsInput | string | null
    documents?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    resumePath?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    experiences?: ApplicantExperienceUpdateManyWithoutApplicantNestedInput
  }

  export type ApplicantUncheckedUpdateWithoutEducationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    positionApplied?: StringFieldUpdateOperationsInput | string
    expectedSalary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employmentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    dateOfBirth?: DateTimeFieldUpdateOperationsInput | Date | string
    age?: IntFieldUpdateOperationsInput | number
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    nationality?: NullableStringFieldUpdateOperationsInput | string | null
    religion?: NullableStringFieldUpdateOperationsInput | string | null
    race?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    residenceType?: NullableStringFieldUpdateOperationsInput | string | null
    livingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    maritalStatus?: NullableStringFieldUpdateOperationsInput | string | null
    militaryStatus?: NullableStringFieldUpdateOperationsInput | string | null
    childrenCount?: IntFieldUpdateOperationsInput | number
    skills?: NullableStringFieldUpdateOperationsInput | string | null
    documents?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    resumePath?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    experiences?: ApplicantExperienceUncheckedUpdateManyWithoutApplicantNestedInput
  }

  export type ApplicantCreateWithoutExperiencesInput = {
    id?: string
    positionApplied: string
    expectedSalary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    employmentStatus?: string | null
    firstName: string
    lastName: string
    nickname?: string | null
    dateOfBirth: Date | string
    age: number
    gender?: string | null
    nationality?: string | null
    religion?: string | null
    race?: string | null
    phone: string
    email: string
    address: string
    residenceType?: string | null
    livingDuration?: number | null
    maritalStatus?: string | null
    militaryStatus?: string | null
    childrenCount?: number
    skills?: string | null
    documents?: string | null
    photoPath?: string | null
    resumePath?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    educations?: ApplicantEducationCreateNestedManyWithoutApplicantInput
  }

  export type ApplicantUncheckedCreateWithoutExperiencesInput = {
    id?: string
    positionApplied: string
    expectedSalary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    employmentStatus?: string | null
    firstName: string
    lastName: string
    nickname?: string | null
    dateOfBirth: Date | string
    age: number
    gender?: string | null
    nationality?: string | null
    religion?: string | null
    race?: string | null
    phone: string
    email: string
    address: string
    residenceType?: string | null
    livingDuration?: number | null
    maritalStatus?: string | null
    militaryStatus?: string | null
    childrenCount?: number
    skills?: string | null
    documents?: string | null
    photoPath?: string | null
    resumePath?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    educations?: ApplicantEducationUncheckedCreateNestedManyWithoutApplicantInput
  }

  export type ApplicantCreateOrConnectWithoutExperiencesInput = {
    where: ApplicantWhereUniqueInput
    create: XOR<ApplicantCreateWithoutExperiencesInput, ApplicantUncheckedCreateWithoutExperiencesInput>
  }

  export type ApplicantUpsertWithoutExperiencesInput = {
    update: XOR<ApplicantUpdateWithoutExperiencesInput, ApplicantUncheckedUpdateWithoutExperiencesInput>
    create: XOR<ApplicantCreateWithoutExperiencesInput, ApplicantUncheckedCreateWithoutExperiencesInput>
    where?: ApplicantWhereInput
  }

  export type ApplicantUpdateToOneWithWhereWithoutExperiencesInput = {
    where?: ApplicantWhereInput
    data: XOR<ApplicantUpdateWithoutExperiencesInput, ApplicantUncheckedUpdateWithoutExperiencesInput>
  }

  export type ApplicantUpdateWithoutExperiencesInput = {
    id?: StringFieldUpdateOperationsInput | string
    positionApplied?: StringFieldUpdateOperationsInput | string
    expectedSalary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employmentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    dateOfBirth?: DateTimeFieldUpdateOperationsInput | Date | string
    age?: IntFieldUpdateOperationsInput | number
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    nationality?: NullableStringFieldUpdateOperationsInput | string | null
    religion?: NullableStringFieldUpdateOperationsInput | string | null
    race?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    residenceType?: NullableStringFieldUpdateOperationsInput | string | null
    livingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    maritalStatus?: NullableStringFieldUpdateOperationsInput | string | null
    militaryStatus?: NullableStringFieldUpdateOperationsInput | string | null
    childrenCount?: IntFieldUpdateOperationsInput | number
    skills?: NullableStringFieldUpdateOperationsInput | string | null
    documents?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    resumePath?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    educations?: ApplicantEducationUpdateManyWithoutApplicantNestedInput
  }

  export type ApplicantUncheckedUpdateWithoutExperiencesInput = {
    id?: StringFieldUpdateOperationsInput | string
    positionApplied?: StringFieldUpdateOperationsInput | string
    expectedSalary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employmentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    dateOfBirth?: DateTimeFieldUpdateOperationsInput | Date | string
    age?: IntFieldUpdateOperationsInput | number
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    nationality?: NullableStringFieldUpdateOperationsInput | string | null
    religion?: NullableStringFieldUpdateOperationsInput | string | null
    race?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    residenceType?: NullableStringFieldUpdateOperationsInput | string | null
    livingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    maritalStatus?: NullableStringFieldUpdateOperationsInput | string | null
    militaryStatus?: NullableStringFieldUpdateOperationsInput | string | null
    childrenCount?: IntFieldUpdateOperationsInput | number
    skills?: NullableStringFieldUpdateOperationsInput | string | null
    documents?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    resumePath?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    educations?: ApplicantEducationUncheckedUpdateManyWithoutApplicantNestedInput
  }

  export type ApplicantEducationCreateManyApplicantInput = {
    id?: string
    level: string
    institution: string
    major?: string | null
    graduatedYear?: number | null
    gpa?: Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantExperienceCreateManyApplicantInput = {
    id?: string
    company: string
    position: string
    salary?: Decimal | DecimalJsLike | number | string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    reasonForLeaving?: string | null
  }

  export type ApplicantEducationUpdateWithoutApplicantInput = {
    id?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    institution?: StringFieldUpdateOperationsInput | string
    major?: NullableStringFieldUpdateOperationsInput | string | null
    graduatedYear?: NullableIntFieldUpdateOperationsInput | number | null
    gpa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantEducationUncheckedUpdateWithoutApplicantInput = {
    id?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    institution?: StringFieldUpdateOperationsInput | string
    major?: NullableStringFieldUpdateOperationsInput | string | null
    graduatedYear?: NullableIntFieldUpdateOperationsInput | number | null
    gpa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantEducationUncheckedUpdateManyWithoutApplicantInput = {
    id?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    institution?: StringFieldUpdateOperationsInput | string
    major?: NullableStringFieldUpdateOperationsInput | string | null
    graduatedYear?: NullableIntFieldUpdateOperationsInput | number | null
    gpa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type ApplicantExperienceUpdateWithoutApplicantInput = {
    id?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    reasonForLeaving?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ApplicantExperienceUncheckedUpdateWithoutApplicantInput = {
    id?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    reasonForLeaving?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ApplicantExperienceUncheckedUpdateManyWithoutApplicantInput = {
    id?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    reasonForLeaving?: NullableStringFieldUpdateOperationsInput | string | null
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ApplicantCountOutputTypeDefaultArgs instead
     */
    export type ApplicantCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ApplicantCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use JobApplicationDefaultArgs instead
     */
    export type JobApplicationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = JobApplicationDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ApplicantDefaultArgs instead
     */
    export type ApplicantArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ApplicantDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ApplicantEducationDefaultArgs instead
     */
    export type ApplicantEducationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ApplicantEducationDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ApplicantExperienceDefaultArgs instead
     */
    export type ApplicantExperienceArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ApplicantExperienceDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}