import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Bars3Icon, BellIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline'
import logo from '../images/fleetlyWhite.png';
import { useSession } from '../providers/SessionProvider'; // Import useSession

const getNavigationItems = (userRole) => {
  // Driver role navigation
  if (userRole === 'driver') {
    return [
      { name: 'My Trips', href: '/DriverDashboard', current: false },
    ];
  }
  
  // Admin/User role navigation
  return [
    { name: 'Safety Compliance', href: '#', current: true, dropdown: true, options: [
        { name: 'Companies', href: '/ActiveCompanies' },
        { name: 'Drivers', href: '/ActiveDrivers' },
        { name: 'Trucks', href: '/ActiveTrucks' },
        { name: 'Trailers', href: '/ActiveTrailers' },
      ] 
    },
    { name: 'Trips', href: '/Trips', current: false },
    { name: 'Maintenance', href: '/Maintenance', current: false },
    { name: 'Recruitment', href: '/Recruitment', current: false },
  ];
};

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function handleSignOut(setSession) {
  // Clear user session or token
  localStorage.removeItem('session'); // Clear session from localStorage
  setSession({ accessToken: '', refreshToken: '' }); // Clear session state
  // Redirect to login page
  window.location.href = '/login';
}

export default function Example() {
  const { session, setSession, userProfile } = useSession(); // Access session, setSession, and userProfile from SessionProvider
  const userRole = session?.userInfo?.role || 'user';
  const navigation = getNavigationItems(userRole);
  
  return (
    <Disclosure as="nav" className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button*/}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:ring-2 focus:ring-white focus:outline-hidden focus:ring-inset">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
            </DisclosureButton>
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center">
              <img
                alt="Your Company"
                src={logo}
                className="h-12 w-auto" // Increased height to 12
              />
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  item.dropdown ? (
                    <Menu as="div" key={item.name} className="relative">
                      <MenuButton className={classNames(
                        'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'rounded-md px-3 py-2 text-sm font-medium'
                      )}>
                        {item.name}
                      </MenuButton>
                      <MenuItems className="absolute z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
                        {item.options.map(option => (
                          <MenuItem key={option.name}>
                            <a
                              href={option.href}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {option.name}
                            </a>
                          </MenuItem>
                        ))}
                      </MenuItems>
                    </Menu>
                  ) : (
                    <a
                      key={item.name}
                      href={item.href}
                      aria-current={item.current ? 'page' : undefined}
                      className={classNames(
                        item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'rounded-md px-3 py-2 text-sm font-medium',
                      )}
                    >
                      {item.name}
                    </a>
                  )
                ))}
              </div>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <button
              type="button"
              className="relative rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-hidden"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View notifications</span>
              <BellIcon aria-hidden="true" className="size-6" />
            </button>

            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-3">
              <div>
                <MenuButton className="relative flex rounded-full bg-gray-800 text-sm focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-hidden">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">Open user menu</span>
                  <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center">
                    {userProfile?.first_name || userProfile?.last_name ? (
                      <span className="text-xs font-medium text-blue-800">
                        {userProfile.first_name?.charAt(0) || ''}{userProfile.last_name?.charAt(0) || ''}
                      </span>
                    ) : (
                      <UserIcon className="size-5 text-gray-400" />
                    )}
                  </div>
                </MenuButton>
              </div>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <MenuItem>
                  <a
                    href="/Settings"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                  >
                    Settings
                  </a>
                </MenuItem>
                <MenuItem>
                  <a
                    href="/UserManagement"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                  >
                    User Management
                  </a>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={() => handleSignOut(setSession)} // Pass setSession to handleSignOut
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                  >
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 px-2 pt-2 pb-3">
          {navigation.map((item) => (
            item.dropdown ? (
              <div key={item.name} className="space-y-1">
                <DisclosureButton
                  as="div"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white block rounded-md px-3 py-2 text-base font-medium"
                >
                  {item.name}
                </DisclosureButton>
                <div className="pl-4">
                  {item.options.map(option => (
                    <DisclosureButton
                      key={option.name}
                      as="a"
                      href={option.href}
                      className="block text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-base font-medium"
                    >
                      {option.name}
                    </DisclosureButton>
                  ))}
                </div>
              </div>
            ) : (
              <DisclosureButton
                key={item.name}
                as="a"
                href={item.href}
                aria-current={item.current ? 'page' : undefined}
                className={classNames(
                  item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                  'block rounded-md px-3 py-2 text-base font-medium',
                )}
              >
                {item.name}
              </DisclosureButton>
            )
          ))}
        </div>
      </DisclosurePanel>
    </Disclosure>
  )
}
